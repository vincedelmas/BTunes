import {genreChoices, resolveGenre} from "../../shared/genres.ts";
import {promisify} from "node:util";
import {readTags} from "./metadata.ts";
import {parseFile} from "music-metadata";
import {createReadStream} from "node:fs";
import {execFile} from "node:child_process";
import type {LibraryService} from "./library";
import {tagFields} from "../../shared/tags.ts";
import {createHash, randomUUID} from "node:crypto";
import type {EmbeddedArtwork} from "../types/artwork.ts";
import type {PlannedFile, SavePlan} from "../types/tags";
import {basename, dirname, extname, join} from "node:path";
import {tagPatchFieldsSchema} from "../../shared/schemas/tags.ts";
import type {TagPatch, TagPreview, TagSaveResult} from "../../shared/types/tags.ts";
import {chmod, copyFile, lstat, mkdir, rename, rm, writeFile} from "node:fs/promises";


const run = promisify(execFile);
const previewLifetime = 10 * 60 * 1000;
const metadataNames: Record<string, string> = { year: "date", albumArtist: "album_artist" };


const formats: Record<string, string> = {
    ".mp3": "mp3",
    ".flac": "flac",
    ".m4a": "ipod",
};


async function fingerprint(path: string) {
    const info = await lstat(path);

    if (!info.isFile() || info.nlink > 1) {
        throw new Error("Tag editing requires a regular file without hard links.");
    }

    const hash = createHash("sha256");
    for await (const chunk of createReadStream(path)) {
        hash.update(chunk);
    }

    return hash.digest("hex");
}


function pictureHashes(pictures: Awaited<ReturnType<typeof parseFile>>["common"]["picture"]) {
    return (pictures ?? [])
        .map((picture) => createHash("sha256").update(picture.data).digest("hex"))
        .sort();
}


export class TagService {
    private saving = false;
    private readonly backupRoot: string;
    private plans = new Map<string, SavePlan>();
    private library: Pick<LibraryService, "repo" | "index">;

    constructor(library: Pick<LibraryService, "repo" | "index">, backupRoot: string) {
        this.library = library;
        this.backupRoot = backupRoot;
    }

    async preview(ids: number[], input: TagPatch, artwork?: EmbeddedArtwork): Promise<TagPreview> {
        const files: PlannedFile[] = [];
        const patch = tagPatchFieldsSchema.parse(input);
        if (patch.genre) {
            const genres = genreChoices(this.library.repo.snapshot().tracks.map((track) => track.genre));
            patch.genre = resolveGenre(patch.genre, genres);
        }

        const preview: TagPreview = { token: randomUUID(), files: [] };

        if (!Object.keys(patch).length && !artwork) {
            throw new Error("Choose a tag or cover to change.");
        }

        for (const [token, plan] of this.plans) {
            if (plan.expiresAt < Date.now()) this.plans.delete(token);
        }

        // Bound retained preview state, even when renderer repeatedly abandons dialogs
        if (this.plans.size >= 50) {
            this.plans.delete(this.plans.keys().next().value!);
        }

        for (const id of new Set(ids)) {
            const track = this.library.repo.get(id);
            if (!track) throw new Error("Track not found.");

            if (!formats[extname(track.path).toLowerCase()]) {
                throw new Error("Tag writing currently supports MP3, FLAC, and M4A files.");
            }

            const sourceFingerprint = await fingerprint(track.path);
            const currentValues = readTags(await parseFile(track.path));

            if ((await fingerprint(track.path)) !== sourceFingerprint) {
                throw new Error("A file changed while preparing the preview. Try again.");
            }

            const changes = tagFields
                .filter((field) => patch[field] !== undefined && patch[field] !== currentValues[field])
                .map((field) => ({
                    field,
                    after: patch[field]!,
                    before: currentValues[field],
                }));

            if (!changes.length && !artwork) continue;

            files.push({ track, fingerprint: sourceFingerprint, patch, artwork });
            preview.files.push({ id, title: track.title, path: track.path, changes });
        }

        this.plans.set(preview.token, { files, expiresAt: Date.now() + previewLifetime });

        return preview;
    }

    async save(token: string): Promise<TagSaveResult> {
        if (this.saving) {
            throw new Error("Another tag save is in progress.");
        }

        const plan = this.plans.get(token);
        if (!plan || plan.expiresAt < Date.now()) {
            throw new Error("This preview has expired. Preview your changes again.");
        }

        this.saving = true;
        this.plans.delete(token);

        const replaced: (typeof prepared)[number][] = [];
        const backupDirectory = join(this.backupRoot, token);
        const prepared: { file: PlannedFile; temporary: string; backup: string }[] = [];

        try {
            if (!plan.files.length) {
                return { updated: 0, backupDirectory: "" };
            }

            try {
                await run("ffmpeg", ["-version"], { timeout: 10000 });
            }
            catch {
                throw new Error("FFmpeg is required to save tags. Install it with: sudo pacman -S ffmpeg");
            }

            await mkdir(backupDirectory, { recursive: true });
            await writeFile(
                join(backupDirectory, "manifest.json"),
                JSON.stringify(plan.files
                    .map(({ track }) => ({ id: track.id, path: track.path })), null, 2),
            );

            const imagePath = join(backupDirectory, "selected-cover.jpg");
            const artwork = plan.files[0].artwork;

            if (artwork) {
                await writeFile(imagePath, artwork.data);
            }

            // Prepare and verify output before replacing any source file
            for (const file of plan.files) {
                const { track, patch } = file;
                if ((await fingerprint(track.path)) !== file.fingerprint) {
                    throw new Error("A file changed since the preview. Preview your changes again.");
                }

                const temporary = join(dirname(track.path), "." + basename(track.path) + "." + token + ".tmp");
                const backup = join(backupDirectory, track.id + extname(track.path));

                const item = { file, temporary, backup };
                prepared.push(item);

                await copyFile(track.path, backup);
                const original = await parseFile(track.path);

                const imageArguments = file.artwork
                    ? ["-i", imagePath, "-map", "0:a", "-map", "1:v", "-disposition:v:0", "attached_pic"]
                    : ["-map", "0"];

                const metadataArguments = Object.entries(patch)
                    .flatMap(([key, value]) => [
                        "-metadata",
                        (metadataNames[key] ?? key) + "=" + (value === 0 ? "" : String(value))
                    ]);

                await run("ffmpeg", [
                    "-nostdin", "-v", "error", "-n", "-i", track.path, ...imageArguments,
                    "-map_metadata", "0", "-c", "copy", ...metadataArguments, "-f",
                    formats[extname(track.path).toLowerCase()], temporary,
                ], { timeout: 120000, maxBuffer: 1024 * 1024 });

                const written = await parseFile(temporary);
                const writtenValues = readTags(written);

                for (const field of tagFields) {
                    if (patch[field] !== undefined && writtenValues[field] !== patch[field]) {
                        throw new Error(`Could not verify written ${field} tag. Original file not replaced.`);
                    }
                }

                const expectedPictures = file.artwork ? [file.artwork.hash] : pictureHashes(original.common.picture);
                if (JSON.stringify(expectedPictures) !== JSON.stringify(pictureHashes(written.common.picture))) {
                    throw new Error("Artwork verification failed. Original file not replaced.");
                }

                const info = await lstat(track.path);
                await chmod(temporary, info.mode);
            }

            for (const item of prepared) {
                if ((await fingerprint(item.file.track.path)) !== item.file.fingerprint) {
                    throw new Error("A file changed during the save. Preview your changes again.");
                }

                await rename(item.temporary, item.file.track.path);
                replaced.push(item);
            }

            for (const { file } of prepared) {
                await this.library.index(file.track.path);
            }

            return { updated: prepared.length, backupDirectory };
        }
        catch (error) {
            // Restore using sibling temp file so restoration is atomic too
            const failures: string[] = [];

            for (const item of [...replaced].reverse()) {
                try {
                    await copyFile(item.backup, item.temporary);
                    await rename(item.temporary, item.file.track.path);
                    await this.library.index(item.file.track.path);
                }
                catch {
                    failures.push(item.file.track.path);
                }
            }

            if (failures.length) {
                throw new Error("Could not restore: " + failures.join(", ") + ". Original backups: " + backupDirectory, { cause: error });
            }

            throw error;
        }
        finally {
            await Promise.allSettled(prepared.map(({ temporary }) => rm(temporary, { force: true })));
            this.saving = false;
        }
    }
}
