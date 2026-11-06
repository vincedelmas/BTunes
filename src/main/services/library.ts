import {createHash} from "node:crypto";
import {parseFile} from "music-metadata";
import {type FSWatcher, watch} from "chokidar";
import {basename, extname, join} from "node:path";
import {LibraryRepository} from "../repositories/library";
import {mkdir, readdir, stat, writeFile} from "node:fs/promises";


const audioExtensions = new Set([
    ".mp3",
    ".flac",
    ".ogg",
    ".opus",
    ".m4a",
    ".aac",
    ".wav",
    ".aiff",
]);


export class LibraryService {
    private watcher?: FSWatcher;
    private jobs = new Map<string, Promise<void>>();

    constructor(
        readonly repo: LibraryRepository,
        readonly covers: string,
    ) {
    }

    async index(path: string) {
        if (!audioExtensions.has(extname(path).toLowerCase())) return;

        const previous = this.jobs.get(path) ?? Promise.resolve();
        const job = previous.catch(() => {
        })
            .then(async () => {
                const file = await stat(path);
                const metadata = await parseFile(path);

                const tags = metadata.common;
                let cover: string | null = null;

                if (tags.picture?.[0]) {
                    const picture = tags.picture[0];
                    cover = createHash("sha256").update(picture.data).digest("hex");

                    await mkdir(this.covers, { recursive: true });
                    await writeFile(join(this.covers, cover), picture.data);
                }

                this.repo.upsert({
                    path,
                    cover,
                    size: file.size,
                    year: tags.year || 0,
                    album: tags.album || "Unknown album",
                    artist: tags.artist || "Unknown artist",
                    duration: metadata.format.duration || 0,
                    genre: tags.genre?.[0] || "Uncategorized",
                    title: tags.title || basename(path, extname(path)),
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
            if (!track.path.startsWith(folder + "/")) continue;

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

    async close() {
        await this.watcher?.close();
        await Promise.allSettled(this.jobs.values());
        this.repo.db.close();
    }
}
