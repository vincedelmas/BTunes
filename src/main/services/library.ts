import {watch} from "chokidar";
import type {Stats} from "node:fs";
import {readTags} from "./metadata.ts";
import type {FSWatcher} from "chokidar";
import {parseFile} from "music-metadata";
import {createHash, randomUUID} from "node:crypto";
import {isAudioFile} from "../../shared/audio-files.ts";
import {basename, extname, join, resolve, sep} from "node:path";
import type {LibraryRepository} from "../repositories/library.ts";
import {access, link, mkdir, readdir, rm, stat, writeFile} from "node:fs/promises";

const scanWorkers = 4;
const folderIdentity = (info: Stats) => info.dev + ":" + info.ino;

export class LibraryService {
    private closing = false;
    private closed?: Promise<void>;
    private reconciliation?: Promise<{ errors: string[] }>;
    readonly covers: string;
    private watcher?: FSWatcher;
    private watching = Promise.resolve();
    private coverSweep = Promise.resolve();
    private coverWrites = new Map<string, Promise<void>>();
    private readonly readMetadata: typeof parseFile;
    readonly repo: LibraryRepository;
    private operations = new Set<Promise<unknown>>();
    private jobs = new Map<string, Promise<unknown>>();

    constructor(repo: LibraryRepository, covers: string, readMetadata: typeof parseFile = parseFile) {
        this.repo = repo;
        this.covers = covers;
        this.readMetadata = readMetadata;
    }

    private track<T>(operation: Promise<T>) {
        this.operations.add(operation);
        void operation.finally(() => this.operations.delete(operation)).catch(() => undefined);
        return operation;
    }

    private async enqueue<T>(path: string, action: () => Promise<T>) {
        if (this.closing) throw new Error("The library is shutting down.");
        const previous = this.jobs.get(path) ?? Promise.resolve();
        const job = Promise.all([previous.catch(() => undefined), this.coverSweep]).then(action);
        this.jobs.set(path, job);

        try {
            return await job;
        }
        finally {
            if (this.jobs.get(path) === job) this.jobs.delete(path);
        }
    }

    async index(path: string) {
        if (isAudioFile(path)) await this.indexFile(path);
    }

    private indexFile(path: string, previous?: ReturnType<LibraryRepository["indexedFiles"]>[number], scanning = false) {
        return this.enqueue(path, async () => {
            const file = await stat(path);
            if (previous?.albumArtist && previous.duration > 0 && previous.modifiedAt === file.mtimeMs && previous.size === file.size) {
                return false;
            }

            let metadata = await this.readMetadata(path);
            if (!Number.isFinite(metadata.format.duration) || !metadata.format.duration || metadata.format.duration < 0) {
                // Some MP3 headers report zero; scan audio frames only when the quick read has no usable duration.
                metadata = await this.readMetadata(path, { duration: true });
            }

            const tags = readTags(metadata);
            let cover: string | null = null;

            if (metadata.common.picture?.[0]) {
                const picture = metadata.common.picture[0];
                cover = createHash("sha256").update(picture.data).digest("hex");
                await this.storeCover(cover, picture.data);
            }

            const current = await stat(path);
            if (current.dev !== file.dev || current.ino !== file.ino ||
                current.size !== file.size || current.mtimeMs !== file.mtimeMs) {
                throw new Error("File changed while indexing: " + path);
            }

            this.repo.upsert({
                path, cover, size: file.size, modifiedAt: file.mtimeMs,
                year: tags.year || 0,
                genre: tags.genre || "Uncategorized",
                album: tags.album || "Unknown album",
                artist: tags.artist || "Unknown artist",
                duration: metadata.format.duration || 0,
                title: tags.title || basename(path, extname(path)),
                albumArtist: tags.albumArtist || tags.artist || "Unknown artist",
            }, scanning);

            return true;
        });
    }

    private storeCover(hash: string, data: Uint8Array) {
        const pending = this.coverWrites.get(hash);
        if (pending) return pending;

        const write = (async () => {
            const target = join(this.covers, hash);
            if (await access(target).then(() => true, () => false)) return;

            await mkdir(this.covers, { recursive: true });
            const temporary = join(this.covers, ".cover-" + randomUUID() + ".tmp");
            try {
                await writeFile(temporary, data, { flag: "wx" });
                await link(temporary, target).catch((error: NodeJS.ErrnoException) => {
                    if (error.code !== "EEXIST") throw error;
                });
            }
            finally {
                await rm(temporary, { force: true });
            }
        })().finally(() => this.coverWrites.delete(hash));

        this.coverWrites.set(hash, write);
        return write;
    }

    private pruneCovers() {
        // Finish queued writes before reading references. New jobs wait for this sweep.
        this.coverSweep = Promise.allSettled([this.coverSweep, ...this.jobs.values()]).then(async () => {
            const entries = await readdir(this.covers, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
                if (error.code === "ENOENT") return [];
                throw error;
            });
            if (!entries.length) return;

            const referenced = new Set(this.repo.coverHashes());
            if (!this.repo.checkpoint()) return;
            for (const entry of entries) {
                if (!entry.isFile() || referenced.has(entry.name)) continue;
                if (/^[a-f0-9]{64}$|^\.cover-[a-f0-9-]{36}\.tmp$/.test(entry.name)) {
                    await rm(join(this.covers, entry.name), { force: true });
                }
            }
        }).catch((error: unknown) => console.warn("Could not prune library covers:", error));

        return this.coverSweep;
    }

    remove(path: string) {
        return this.enqueue(path, async () => {
            const folder = this.repo.watchedFolders()
                .filter((folder) => path.startsWith(folder.path.endsWith(sep) ? folder.path : folder.path + sep))
                .sort((first, second) => second.path.length - first.path.length)[0];
            if (folder) {
                const root = await stat(folder.path).catch(() => undefined);
                if (!root || (folder.identity && folderIdentity(root) !== folder.identity)) return;
            }

            try {
                await stat(path);
            }
            catch (error) {
                if ((error as NodeJS.ErrnoException).code === "ENOENT") this.repo.remove(path);
                else throw error;
            }
        });
    }

    scan(folder: string) {
        if (this.closing) return Promise.reject(new Error("The library is shutting down."));
        return this.track(this.scanFolder(resolve(folder), true));
    }

    reconcile() {
        if (this.closing) return Promise.reject(new Error("The library is shutting down."));
        this.reconciliation ??= this.track(this.reconcileFolders().finally(() => {
            this.reconciliation = undefined;
        }));
        return this.reconciliation;
    }

    private async reconcileFolders() {
        const errors: string[] = [];
        for (const folder of this.repo.watchedFolders()) {
            if (this.closing) break;
            try {
                const result = await this.scanFolder(folder.path, false, folder.identity);
                errors.push(...result.errors);
            }
            catch {
                errors.push(folder.path);
            }
        }
        if (!this.closing) await this.pruneCovers();
        return { errors };
    }

    private async scanFolder(folder: string, importing: boolean, expectedIdentity = "") {
        const root = await stat(folder);
        if (!root.isDirectory()) throw new Error("Music folder is unavailable.");
        const identity = folderIdentity(root);
        if (!importing && expectedIdentity && identity !== expectedIdentity) return { imported: 0, errors: [folder] };

        let imported = 0;
        let found = 0;
        const seen = new Set<string>();
        const errors: string[] = [];
        const prefix = folder.endsWith(sep) ? folder : folder + sep;
        const indexed = this.repo.indexedFiles().filter((track) => track.path.startsWith(prefix));
        const known = new Map(indexed.map((track) => [track.path, track]));

        const visit = async function* (directory: string): AsyncGenerator<string> {
            for (const entry of await readdir(directory, { withFileTypes: true })) {
                const path = join(directory, entry.name);
                if (entry.isDirectory()) {
                    try {
                        yield* visit(path);
                    }
                    catch {
                        errors.push(path);
                    }
                }
                else if (entry.isFile() && isAudioFile(path)) {
                    found++;
                    seen.add(path);
                    yield path;
                }
            }
        };

        const paths = visit(folder);
        const worker = async () => {
            while (!this.closing) {
                const next = await paths.next();
                if (next.done || this.closing) return;

                try {
                    if (await this.indexFile(next.value, known.get(next.value), true)) imported++;
                }
                catch {
                    errors.push(next.value);
                }
            }
        };

        const results = await Promise.allSettled(Array.from({ length: scanWorkers }, worker));
        await paths.return(undefined);
        for (const result of results) {
            if (result.status === "rejected") throw result.reason;
        }
        if (this.closing) return { imported, errors };
        if (folderIdentity(await stat(folder)) !== identity) return { imported, errors: [...errors, folder] };

        // An empty mount-point stub must never erase a previously indexed drive.
        const canIdentify = importing || Boolean(expectedIdentity) || found > 0;
        if (canIdentify && !errors.length && (importing || Boolean(expectedIdentity))) {
            for (const track of indexed) {
                if (this.closing) break;
                if (seen.has(track.path)) continue;
                await this.remove(track.path).catch(() => errors.push(track.path));
            }
        }

        if (!this.closing && canIdentify && expectedIdentity !== identity) this.repo.folder(folder, identity);
        if (!this.closing && importing) await this.startWatching();
        return { imported, errors };
    }

    startWatching() {
        if (this.closing) return Promise.resolve();
        this.watching = this.watching.catch(() => undefined).then(() => this.watchFolders());
        return this.watching;
    }

    private async watchFolders() {
        if (this.closing) return;
        await this.watcher?.close();
        if (this.closing) return;

        this.watcher = watch(this.repo.watchedFolders().map((folder) => folder.path), {
            ignoreInitial: true,
            awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 },
        });
        const indexChangedFile = (path: string) => {
            if (!this.closing) void this.index(path).catch(console.error);
        };
        this.watcher.on("add", indexChangedFile).on("change", indexChangedFile)
            .on("unlink", (path) => {
                if (!this.closing) void this.remove(path).catch(console.error);
            }).on("error", console.error);
    }

    close() {
        if (!this.closed) {
            this.closing = true;
            this.closed = (async () => {
                await this.watching.catch(() => undefined);
                await this.watcher?.close().catch(console.error);
                await Promise.allSettled(this.operations);
                await Promise.allSettled(this.jobs.values());
                this.repo.db.close();
            })();
        }
        return this.closed;
    }
}
