import {Menu} from "electron";
import {basename} from "node:path";
import type {FileImportChoice} from "../../shared/types/file-import";
import type {BrowserWindow, MenuItemConstructorOptions} from "electron";

export function fileDropMenu(win: BrowserWindow, folders: string[], x: number, y: number) {
    if (!folders.length) throw new Error("Add a music folder in Settings before dropping songs.");

    return new Promise<FileImportChoice | null>((resolve) => {
        function folderItems(folder: string): MenuItemConstructorOptions[] {
            return [
                { label: "Copy here", click: () => resolve({ folder, operation: "copy" }) },
                { label: "Move here", click: () => resolve({ folder, operation: "move" }) },
            ];
        }

        const items: MenuItemConstructorOptions[] = folders.length === 1
            ? folderItems(folders[0])
            : folders.map((folder) => ({ label: basename(folder), sublabel: folder, submenu: folderItems(folder) }));
        items.push({ type: "separator" }, { label: "Cancel", click: () => resolve(null) });
        Menu.buildFromTemplate(items).popup({ window: win, x, y, callback: () => resolve(null) });
    });
}
