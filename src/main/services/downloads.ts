import {fileHash} from "./file-hash.ts";
import {mkdir, mkdtemp, readFile, rm, stat, writeFile} from "node:fs/promises";
import {basename, dirname, join, resolve} from "node:path";
import {parseFile} from "music-metadata";
import type {DownloadItem, DownloadSnapshot, DownloaderSettings} from "../../shared/types/downloads.ts";
import type {TagPatch} from "../../shared/types/tags.ts";
import type {DownloadRepository} from "../repositories/downloads.ts";
import type {LibraryService} from "./library.ts";
import type {ArtworkService} from "./artwork.ts";
import type {DownloadRunner, DownloadToolProvider} from "../types/downloads.ts";
import {tagPatchFieldsSchema} from "../../shared/schemas/tags.ts";
import {getErrorMessage} from "../../shared/errors.ts";
import {safeDownloadName, scanBookmarks} from "./bookmarks.ts";
import {downloadProcess} from "./download-process.ts";
import {DownloadMetadata} from "./download-metadata.ts";
import {FileImportService} from "./file-import.ts";
import {tagArguments} from "./tag-arguments.ts";
import {pictureHashes, readTags} from "./metadata.ts";

export class DownloaderService {
    private revision = 0;
    private scanning = false;
    private restoration?: Promise<void>;
    private error = "";
    private items = new Map<string, DownloadItem>();
    private stages = new Map<string, string>();
    private controller?: AbortController;
    private batch?: Promise<void>;
    private publishing = new Set<Promise<void>>();
    private readonly repo: DownloadRepository;
    private readonly library: LibraryService;
    private readonly artwork: Pick<ArtworkService, "search" | "get">;
    private readonly tools: DownloadToolProvider;
    private readonly root: string;
    private readonly run: DownloadRunner;
    private readonly metadata = new DownloadMetadata();

    constructor(repo: DownloadRepository, library: LibraryService, artwork: Pick<ArtworkService, "search" | "get">, tools: DownloadToolProvider, root: string, run: DownloadRunner = downloadProcess) {
        this.repo = repo;
        this.library = library;
        this.artwork = artwork;
        this.tools = tools;
        this.root = root;
        this.run = run;
    }

    changed() {
        this.revision++;
    }

    snapshot(revision?: number): DownloadSnapshot | null {
        if (revision === this.revision) return null;
        return structuredClone({
            revision: this.revision,
            scanning: this.scanning,
            busy: Boolean(this.batch),
            error: this.error,
            tools: this.tools.snapshot(),
            items: [...this.items.values()]
        });
    }

    private settings(): DownloaderSettings {
        const settings = this.repo.settings();
        if (!settings.bookmarksFile || !settings.folderId) throw new Error("Configure your bookmarks in Settings first.");
        if (!this.library.repo.watchedFolders().some((folder) => folder.path === settings.destination)) throw new Error("Choose an existing BTunes music folder as the download destination.");
        return settings;
    }

    async enter() {
        void this.tools.check();
        try {
            await this.restore();
            await this.scan();
        }
        catch (error) {
            this.error = getErrorMessage(error);
            this.changed();
        }
    }

    private restore() {
        this.restoration ??= (async () => {
            const history = this.repo.history();
            for (const review of this.repo.reviews()) {
                if (dirname(resolve(review.stage)) !== resolve(this.root)) continue;
                if (history.has(review.item.id)) {
                    this.repo.removeReview(review.item.id);
                    await rm(review.stage, { recursive: true, force: true });
                    continue;
                }
                const exists = await stat(join(review.stage, "audio.mp3")).then((file) => file.isFile(), () => false);
                if (!exists) {
                    this.repo.removeReview(review.item.id);
                    continue;
                }
                const item: DownloadItem = { ...review.item, status: "review", progress: 100 };
                this.items.set(item.id, item);
                this.stages.set(item.id, review.stage);
            }
            this.changed();
        })();
        return this.restoration;
    }

    async scan() {
        if (this.scanning || this.batch) return;
        this.scanning = true;
        this.error = "";
        this.changed();
        try {
            const entries = await scanBookmarks(this.settings());
            const history = this.repo.history();
            const next = new Map<string, DownloadItem>();
            const key = (value: string) => value.normalize("NFKC").trim().toLowerCase();
            const libraryTracks = this.library.repo.snapshot().tracks;
            const byTags = new Map<string, string[]>();
            const byFilename = new Map<string, string[]>();
            for (const track of libraryTracks) {
                const name = key(basename(track.path));
                byFilename.set(name, [...(byFilename.get(name) ?? []), track.path]);
                for (const artist of new Set([track.artist, track.albumArtist || track.artist])) {
                    const identity = key(artist) + "\0" + key(track.title);
                    byTags.set(identity, [...(byTags.get(identity) ?? []), track.path]);
                }
            }
            for (const entry of entries) {
                if (!history.has(entry.id)) {
                    const names = byFilename.get(key(safeDownloadName(entry.name) + ".mp3"));
                    const tags = byTags.get(key(entry.artist) + "\0" + key(entry.title));
                    const matches = names?.length === 1 ? names : tags;
                    if (matches?.length === 1) {
                        this.repo.complete(entry.id, matches[0]);
                        history.set(entry.id, matches[0]);
                    }
                }
                const existing = this.items.get(entry.id);
                if (existing && (existing.status === "review" || existing.status === "publishing")) next.set(entry.id, existing);
                else if (history.has(entry.id)) next.set(entry.id, { ...entry, status: "done", path: history.get(entry.id), progress: 100, message: "Already downloaded" });
                else next.set(entry.id, entry);
            }
            // Keep unfinished reviews even if the bookmark was moved while downloading.
            for (const [id, entry] of this.items) {
                if (entry.status === "review" || entry.status === "publishing") next.set(id, entry);
            }
            this.items = next;
        }
        catch (error) {
            this.error = getErrorMessage(error);
        }
        finally {
            this.scanning = false;
            this.changed();
        }
    }

    start(ids: string[]) {
        if (this.batch || this.scanning) throw new Error("Wait for the current download operation to finish.");
        const settings = this.settings();
        const jobs = [...new Set(ids)].map((id) => this.items.get(id)).filter((item): item is DownloadItem => Boolean(item && ["available", "error", "cancelled"].includes(item.status)));
        if (!jobs.length) throw new Error("Choose songs that are available to download.");
        const controller = new AbortController();
        this.controller = controller;
        for (const job of jobs) {
            job.status = "queued";
            job.message = "Waiting";
            job.progress = 0;
        }
        let cursor = 0;
        const worker = async () => {
            while (cursor < jobs.length && !controller.signal.aborted) {
                const item = jobs[cursor++];
                await this.download(item, settings, controller.signal);
            }
        };
        this.batch = Promise.all(Array.from({ length: Math.min(settings.concurrency, jobs.length) }, worker)).then(() => undefined).catch((error: unknown) => {
            this.error = getErrorMessage(error);
        }).finally(() => {
            for (const item of jobs) if (item.status === "queued") {
                item.status = "cancelled";
                item.message = "Download cancelled.";
            }
            this.batch = undefined;
            this.controller = undefined;
            this.changed();
        });
        this.changed();
    }

    private async download(item: DownloadItem, settings: DownloaderSettings, signal: AbortSignal) {
        let stage: string | undefined;
        try {
            item.status = "downloading";
            item.message = "Preparing audio download…";
            this.changed();
            const tools = await this.tools.acquire();
            signal.throwIfAborted();
            await mkdir(this.root, { recursive: true });
            stage = await mkdtemp(join(this.root, item.id + "-"));
            await this.run(tools.ytDlp, [
                "--ignore-config", "--no-playlist", "--no-overwrites", "--extract-audio", "--audio-format", "mp3", "--audio-quality", settings.quality,
                "--ffmpeg-location", tools.ffmpeg.slice(0, tools.ffmpeg.lastIndexOf("/")), "--js-runtimes", "node", "--newline", "--progress", "--quiet",
                "--progress-template", "download:%(progress._percent_str)s", "--output", join(stage, "audio.%(ext)s"), "--", item.url,
            ], signal, (line) => {
                const percent = /^download:\s*(\d+(?:\.\d+)?)%/.exec(line);
                if (percent) {
                    item.progress = Math.min(99, Number(percent[1]));
                    item.message = "Downloading audio";
                    this.changed();
                }
            });
            await stat(join(stage, "audio.mp3"));
            item.status = "enriching";
            item.message = "Looking up tags and artwork…";
            this.changed();
            const warnings: string[] = [];
            if (settings.fetchMetadata) {
                try {
                    Object.assign(item.tags, await this.metadata.lookup(item.artist, item.title, signal));
                }
                catch (error) {
                    if (signal.aborted) throw error;
                    warnings.push(getErrorMessage(error));
                }
                try {
                    const query = [item.tags.albumArtist || item.tags.artist, item.tags.album === "Unknown album" ? item.tags.title : item.tags.album].filter(Boolean).join(" ");
                    item.artwork = (await this.artwork.search(query))[0];
                    if (!item.artwork) warnings.push("No artwork found. Choose a cover before saving.");
                    else {
                        const image = await this.artwork.get(item.artwork.id);
                        await writeFile(join(stage, "suggested-cover.jpg"), image.data);
                        item.artwork.thumbnail = "btunes://download-cover/" + item.id;
                    }
                }
                catch (error) {
                    warnings.push(getErrorMessage(error));
                }
            }
            signal.throwIfAborted();
            this.stages.set(item.id, stage);
            stage = undefined;
            item.status = "review";
            item.progress = 100;
            item.message = warnings.join(" ") || "Review tags and cover, then save to your library.";
            try {
                this.repo.saveReview(item, this.stages.get(item.id)!);
            }
            catch (error) {
                item.message += " Review could not be saved for the next session: " + getErrorMessage(error);
            }
        }
        catch (error) {
            item.status = signal.aborted ? "cancelled" : "error";
            item.message = getErrorMessage(error);
        }
        finally {
            if (stage) await rm(stage, { recursive: true, force: true });
            this.changed();
        }
    }

    publish(id: string, patch: TagPatch, artworkId?: string) {
        const item = this.items.get(id);
        const stage = this.stages.get(id);
        if (!item || item.status !== "review" || !stage) throw new Error("Download the song before saving it to your library.");
        const settings = this.settings();
        const tags = tagPatchFieldsSchema.parse({ ...item.tags, ...patch });
        if (!tags.title || !tags.artist || !tags.album || !tags.genre) throw new Error("Enter a title, artist, album, and genre before saving.");
        item.status = "publishing";
        this.changed();
        const task = (async () => {
            try {
                const tools = await this.tools.acquire();
                const args = ["-nostdin", "-v", "error", "-y", "-i", join(stage, "audio.mp3")];
                let artworkHash: string | undefined;
                if (artworkId) {
                    const suggested = join(stage, "suggested-cover.jpg");
                    const artwork = artworkId === item.artwork?.id
                        ? { data: await readFile(suggested), hash: await fileHash(suggested) }
                        : await this.artwork.get(artworkId);
                    artworkHash = artwork.hash;
                    await writeFile(join(stage, "cover.jpg"), artwork.data);
                    args.push("-i", join(stage, "cover.jpg"), "-map", "0:a", "-map", "1:v", "-disposition:v:0", "attached_pic");
                }
                else args.push("-map", "0:a");
                const filename = safeDownloadName(tags.artist + " - " + tags.title) + ".mp3";
                const prepared = join(stage, filename);
                args.push("-map_metadata", "-1", "-c", "copy", ...tagArguments(tags), "-metadata", "comment=" + item.url, "-f", "mp3", prepared);
                await this.run(tools.ffmpeg, args, new AbortController().signal);
                const metadata = await parseFile(prepared);
                if (artworkHash && pictureHashes(metadata.common.picture)[0] !== artworkHash) throw new Error("Could not verify the embedded cover.");
                const written = readTags(metadata);
                for (const [key, value] of Object.entries(tags)) {
                    if (written[key as keyof typeof written] !== value) throw new Error("Could not verify the downloaded song's " + key + " tag.");
                }
                const result = await new FileImportService(this.library).import([prepared], { folder: settings.destination, operation: "copy" });
                if (!result.imported) throw new Error(result.errors[0]?.message || "The song could not be added to the library.");
                item.path = result.paths[0];
                item.tags = tags;
                item.status = "done";
                item.message = "Saved to your library";
                this.stages.delete(id);
                try {
                    this.repo.complete(item.id, item.path);
                    this.repo.removeReview(item.id);
                }
                catch (error) {
                    item.message = "Saved, but download history could not be updated: " + getErrorMessage(error);
                }
                await rm(stage, { recursive: true, force: true }).catch(() => undefined);
            }
            catch (error) {
                item.status = "review";
                item.message = getErrorMessage(error);
                throw error;
            }
            finally {
                this.changed();
            }
        })();
        this.publishing.add(task);
        void task.finally(() => this.publishing.delete(task)).catch(() => undefined);
        return task;
    }

    async cover(id: string) {
        const stage = this.stages.get(id);
        if (!stage) throw new Error("No staged cover is available.");
        return readFile(join(stage, "suggested-cover.jpg"));
    }

    cancel() {
        this.controller?.abort();
    }

    async close() {
        this.cancel();
        await this.tools.close();
        await this.batch;
        await Promise.allSettled(this.publishing);
        for (const [id, stage] of this.stages) {
            const item = this.items.get(id);
            if (item?.status === "review") this.repo.saveReview(item, stage);
        }
    }
}
