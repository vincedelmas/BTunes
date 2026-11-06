import type {FSWatcher} from "chokidar";
import {watch} from "chokidar";
import type {Stats} from "node:fs";
import {createHash} from "node:crypto";
import {readTags} from "./metadata.ts";
import {parseFile} from "music-metadata";
import {basename, extname, join, resolve, sep} from "node:path";
import type {LibraryRepository} from "../repositories/library.ts";
import {mkdir, readdir, stat, writeFile} from "node:fs/promises";

const audioExtensions = new Set([".mp3", ".flac", ".ogg", ".opus", ".m4a", ".aac", ".wav", ".aiff"]);
const folderIdentity = (info: Stats) => info.dev + ":" + info.ino;

export class LibraryService {
    private closing = false;
    private closed?: Promise<void>;
    readonly covers: string;
    private watcher?: FSWatcher;
    private watching = Promise.resolve();
    private readonly readMetadata: typeof parseFile;
    readonly repo: LibraryRepository;
    private operations = new Set<Promise<unknown>>();
    private jobs = new Map<string, Promise<void>>();

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

    private async enqueue(path: string, action: () => Promise<void>) {
        if (this.closing) throw new Error("The library is shutting down.");
        const previous = this.jobs.get(path) ?? Promise.resolve();
        const job = previous.catch(() => undefined).then(action);
        this.jobs.set(path, job);

        try {
            await job;
        }
        finally {
            if (this.jobs.get(path) === job) this.jobs.delete(path);
        }
    }

    index(path: string) {
        if (!audioExtensions.has(extname(path).toLowerCase())) return Promise.resolve();

        return this.enqueue(path, async () => {
            const file = await stat(path);
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
                await mkdir(this.covers, { recursive: true });
                await writeFile(join(this.covers, cover), picture.data);
            }

            const current = await stat(path);
            if (current.size !== file.size || current.mtimeMs !== file.mtimeMs) {
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
            });
        });
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
        return this.track((async () => {
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
            return { errors };
        })());
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

        const visit = async (directory: string) => {
            for (const entry of await readdir(directory, { withFileTypes: true })) {
                if (this.closing) return;
                const path = join(directory, entry.name);
                try {
                    if (entry.isDirectory()) await visit(path);
                    else if (entry.isFile() && audioExtensions.has(extname(path).toLowerCase())) {
                        found++;
                        seen.add(path);
                        const info = await stat(path);
                        const previous = known.get(path);
                        if (previous?.albumArtist && previous.duration > 0 && previous.modifiedAt === info.mtimeMs && previous.size === info.size) continue;
                        await this.index(path);
                        imported++;
                    }
                }
                catch {
                    errors.push(path);
                }
            }
        };

        await visit(folder);
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
                await this.watcher?.close();
                await Promise.allSettled(this.operations);
                await Promise.allSettled(this.jobs.values());
                this.repo.db.close();
            })();
        }
        return this.closed;
    }
}
