import {dialog} from "electron";
import {readFile, stat} from "node:fs/promises";
import {rpcSchemas} from "../../shared/schemas/rpc";
import type {LibraryService} from "../services/library";
import type {ArtworkService} from "../services/artwork";
import {readBookmarkFolders} from "../services/bookmarks";
import type {DownloaderService} from "../services/downloads";
import type {DownloadTools} from "../services/download-tools";
import type {RpcInput, RpcRoutes} from "../../shared/types/rpc";
import type {DownloadRepository} from "../repositories/downloads";

export function downloadRoutes(downloads: DownloaderService, downloadRepo: DownloadRepository, library: LibraryService, tools: DownloadTools, artwork: ArtworkService) {
    return {
        "downloads.enter": {
            schema: rpcSchemas["downloads.enter"],
            run: () => {
                void downloads.enter();
            },
        },
        "downloads.get": { schema: rpcSchemas["downloads.get"], run: (input: RpcInput<"downloads.get">) => downloads.snapshot(input.revision) },
        "downloads.start": { schema: rpcSchemas["downloads.start"], run: (input: RpcInput<"downloads.start">) => downloads.start(input.ids) },
        "downloads.cancel": { schema: rpcSchemas["downloads.cancel"], run: () => downloads.cancel() },
        "downloads.publish": {
            schema: rpcSchemas["downloads.publish"],
            run: (input: RpcInput<"downloads.publish">) => downloads.publish(input.id, input.patch, input.artworkId),
        },
        "downloads.tools": {
            schema: rpcSchemas["downloads.tools"], run: () => {
                void tools.check();
            }
        },
        "downloads.settings.get": {
            schema: rpcSchemas["downloads.settings.get"],
            run: () => ({ ...downloadRepo.settings(), destination: downloadRepo.settings().destination || library.repo.watchedFolders()[0]?.path || "" }),
        },
        "downloads.settings.save": {
            schema: rpcSchemas["downloads.settings.save"],
            run: async (input: RpcInput<"downloads.settings.save">) => {
                if (!library.repo.watchedFolders().some((folder) => folder.path === input.destination)) throw new Error("Choose an existing BTunes music folder.");
                const bookmarks = await readBookmarkFolders(input.bookmarksFile);
                if (!bookmarks.nodes.has(input.folderId)) throw new Error("Choose a bookmark folder.");
                return downloadRepo.saveSettings(input);
            },
        },
        "downloads.bookmarks.choose": {
            schema: rpcSchemas["downloads.bookmarks.choose"],
            run: async () => {
                const choice = await dialog.showOpenDialog({ title: "Choose Chrome or Brave Bookmarks file", properties: ["openFile"] });
                return choice.canceled ? null : choice.filePaths[0];
            },
        },
        "downloads.bookmarks.folders": {
            schema: rpcSchemas["downloads.bookmarks.folders"],
            run: async (input: RpcInput<"downloads.bookmarks.folders">) => (await readBookmarkFolders(input.path)).folders,
        },
        "artwork.local": {
            schema: rpcSchemas["artwork.local"],
            run: async () => {
                const choice = await dialog.showOpenDialog({
                    title: "Choose album artwork",
                    properties: ["openFile"],
                    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp"] }]
                });
                if (choice.canceled) return null;
                const info = await stat(choice.filePaths[0]);
                if (!info.isFile() || info.size > 10 * 1024 * 1024) throw new Error("Choose an image smaller than 10 MB.");
                return artwork.local(await readFile(choice.filePaths[0]));
            },
        },
    } satisfies Partial<RpcRoutes>;
}
