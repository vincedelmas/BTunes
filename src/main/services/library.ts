import type {FSWatcher} from "chokidar";
import {watch} from "chokidar";
import {createHash} from "node:crypto";
import {readTags} from "./metadata.ts";
import {parseFile} from "music-metadata";
import {basename, extname, join} from "node:path";
import {LibraryRepository} from "../repositories/library.ts";
import {mkdir, readdir, stat, writeFile} from "node:fs/promises";


const audioExtensions = new Set([".mp3", ".flac", ".ogg", ".opus", ".m4a", ".aac", ".wav", ".aiff"]);


export class LibraryService {
    private closing = false;
    readonly covers: string;
    private watcher?: FSWatcher;
    readonly repo: LibraryRepository;
    private metadataRefresh?: Promise<void>;
    private jobs = new Map<string, Promise<void>>();

    constructor(repo: LibraryRepository, covers: string) {
        this.repo = repo;
        this.covers = covers;
    }

    async index(path: string) {
        if (!audioExtensions.has(extname(path).toLowerCase())) {
            return;
        }

        const previous = this.jobs.get(path) ?? Promise.resolve();
        const job = previous.catch(() => {
        })
            .then(async () => {
                const file = await stat(path);
                const metadata = await parseFile(path);

                const tags = readTags(metadata);
                let cover: string | null = null;

                if (metadata.common.picture?.[0]) {
                    const picture = metadata.common.picture[0];
                    cover = createHash("sha256").update(picture.data).digest("hex");

                    await mkdir(this.covers, { recursive: true });
                    await writeFile(join(this.covers, cover), picture.data);
                }

                this.repo.upsert({
                    path,
                    cover,
                    size: file.size,
                    year: tags.year || 0,
                    genre: tags.genre || "Uncategorized",
                    album: tags.album || "Unknown album",
                    artist: tags.artist || "Unknown artist",
                    duration: metadata.format.duration || 0,
                    title: tags.title || basename(path, extname(path)),
                    albumArtist: tags.albumArtist || tags.artist || "Unknown artist",
                });
            });

        this.jobs.set(path, job);

        try {
            await job;
        }
        finally {
            if (this.jobs.get(path) === job) {
                this.jobs.delete(path);
            }
        }
    }

    async scan(folder: string) {
        let imported = 0;
        const errors: string[] = [];

        const visit = async (directory: string) => {
            for (const entry of await readdir(directory, { withFileTypes: true })) {
                const path = join(directory, entry.name);

                if (entry.isDirectory()) {
                    try {
                        await visit(path);
                    }
                    catch {
                        errors.push(path);
                    }

                    continue;
                }

                if (!entry.isFile() || !audioExtensions.has(extname(path).toLowerCase())) {
                    continue;
                }

                try {
                    await this.index(path);
                    imported++;
                }
                catch {
                    errors.push(path);
                }
            }
        };

        await visit(folder);

        // Prune stale entries only after dir was read successfully
        for (const track of this.repo.snapshot().tracks) {
            if (!track.path.startsWith(folder + "/")) {
                continue;
            }

            try {
                await stat(track.path);
            }
            catch (error) {
                if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                    this.repo.remove(track.path);
                }
            }
        }

        this.repo.folder(folder);
        await this.startWatching();

        return { imported, errors };
    }

    async startWatching() {
        await this.watcher?.close();

        this.watcher = watch(this.repo.snapshot().folders, {
            ignoreInitial: true,
            awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 },
        });

        const indexChangedFile = (path: string) => {
            void this.index(path).catch(console.error);
        };

        this.watcher
            .on("add", indexChangedFile)
            .on("change", indexChangedFile)
            .on("unlink", (path) => this.repo.remove(path))
            .on("error", console.error);
    }

    refreshLegacyMetadata() {
        this.metadataRefresh = (async () => {
            for (const track of this.repo.snapshot().tracks) {
                if (this.closing) break;
                if (track.albumArtist) continue;
                await this.index(track.path).catch(() => undefined);
            }
        })();
        return this.metadataRefresh;
    }

    async close() {
        this.closing = true;
        await this.metadataRefresh;
        await this.watcher?.close();
        await Promise.allSettled(this.jobs.values());
        this.repo.db.close();
    }
}
