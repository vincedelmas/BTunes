import {constants} from "node:fs";
import {fileHash} from "./file-hash.ts";
import type {LibraryService} from "./library.ts";
import {getErrorMessage} from "../../shared/errors.ts";
import {isAudioFile} from "../../shared/audio-files.ts";
import {basename, dirname, extname, join} from "node:path";
import {copyFile, lstat, realpath, rm, stat, unlink} from "node:fs/promises";
import type {FileImportChoice, FileImportResult} from "../../shared/types/file-import.ts";

export class FileImportService {
    private readonly library: Pick<LibraryService, "repo" | "index" | "remove">;

    constructor(library: Pick<LibraryService, "repo" | "index" | "remove">) {
        this.library = library;
    }

    async import(paths: string[], choice: FileImportChoice): Promise<FileImportResult> {
        const configured = this.library.repo.watchedFolders().find((folder) => folder.path === choice.folder);
        if (!configured) throw new Error("Choose a configured music folder.");

        const folder = await realpath(choice.folder);
        const root = await stat(folder);
        if (!root.isDirectory() || (configured.identity && configured.identity !== root.dev + ":" + root.ino)) {
            throw new Error("The music folder is unavailable.");
        }

        const result: FileImportResult = { imported: 0, paths: [], skipped: 0, errors: [] };
        for (const path of new Set(paths)) {
            let destination: string | undefined;
            let sourceRemoved = false;
            try {
                const source = await realpath(path);
                if (!(await lstat(path)).isFile() || !isAudioFile(path)) {
                    throw new Error("Drop audio files, rather than folders or shortcuts.");
                }
                if (dirname(source) === folder) {
                    await this.library.index(source);
                    result.skipped++;
                    continue;
                }

                const before = await stat(source);
                const extension = extname(source);
                const stem = basename(source, extension);
                for (let suffix = 0; ; suffix++) {
                    const name = stem + (suffix ? " (" + (suffix + 1) + ")" : "") + extension;
                    const target = join(folder, name);
                    try {
                        await copyFile(source, target, constants.COPYFILE_EXCL);
                        destination = target;
                        break;
                    }
                    catch (error) {
                        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
                    }
                }

                const after = await stat(source);
                if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || await fileHash(source) !== await fileHash(destination)) {
                    throw new Error("The source changed during import. The original has been kept.");
                }
                await this.library.index(destination);
                if (choice.operation === "move") {
                    // Delete the original only after verifying and indexing the copied audio.
                    const latest = await stat(source);
                    if (latest.dev !== before.dev || latest.ino !== before.ino || latest.size !== before.size || latest.mtimeMs !== before.mtimeMs) {
                        throw new Error("The source changed before moving. The original has been kept.");
                    }
                    await unlink(source);
                    sourceRemoved = true;
                }
                result.imported++;
                result.paths.push(destination);
                if (sourceRemoved) await this.library.remove(source);
            }
            catch (error) {
                let message = getErrorMessage(error);
                if (destination && !sourceRemoved) {
                    try {
                        await rm(destination, { force: true });
                        await this.library.remove(destination);
                    }
                    catch (cleanupError) {
                        const detail = getErrorMessage(cleanupError);
                        message += " Could not finish import cleanup: " + detail;
                    }
                }
                result.errors.push({ path, message });
            }
        }
        return result;
    }
}
