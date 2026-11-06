import {readFile, stat} from "node:fs/promises";
import {compileBookmarkPattern, youtubeVideoId} from "../../shared/bookmarks.ts";
import type {BookmarkFolder, DownloaderSettings, DownloadItem} from "../../shared/types/downloads.ts";

interface BookmarkNode {
    id?: string;
    name?: string;
    type?: string;
    url?: string;
    children?: BookmarkNode[]
}

export async function readBookmarkFolders(path: string) {
    const info = await stat(path);
    if (!info.isFile() || info.size > 30 * 1024 * 1024) throw new Error("Choose a browser Bookmarks file smaller than 30 MB.");
    const data = JSON.parse(await readFile(path, "utf8")) as { roots?: Record<string, BookmarkNode> };
    if (!data.roots || typeof data.roots !== "object") throw new Error("This is not a Chrome/Brave Bookmarks file.");
    const folders: BookmarkFolder[] = [];
    const nodes = new Map<string, BookmarkNode>();
    const pending = Object.values(data.roots).map((node) => ({ node, parent: "" }));
    while (pending.length) {
        const { node, parent } = pending.shift()!;
        if (!node || typeof node !== "object") throw new Error("Invalid bookmark node.");
        const label = parent ? parent + " / " + (node.name ?? "Folder") : node.name ?? "Bookmarks";
        if (node.type === "folder" && typeof node.id === "string") {
            folders.push({ id: node.id, label });
            nodes.set(node.id, node);
        }
        if (node.children) {
            if (!Array.isArray(node.children)) throw new Error("Invalid bookmark folder.");
            pending.push(...node.children.map((child) => ({ node: child, parent: label })));
        }
        if (folders.length > 10000) throw new Error("Too many bookmark folders.");
    }
    return { folders, nodes, roots: data.roots };
}

export async function scanBookmarks(settings: DownloaderSettings): Promise<DownloadItem[]> {
    const { nodes } = await readBookmarkFolders(settings.bookmarksFile);
    const selected = nodes.get(settings.folderId);
    if (!selected) throw new Error("Choose a bookmark folder in Settings.");
    const pattern = compileBookmarkPattern(settings.namePattern);
    const pending = [...(selected.children ?? [])];
    const items = new Map<string, DownloadItem>();
    while (pending.length) {
        const node = pending.shift()!;
        if (node.children) {
            pending.push(...node.children);
            continue;
        }
        if (typeof node.url !== "string" || typeof node.name !== "string") continue;
        let id: string;
        try {
            id = youtubeVideoId(node.url);
        }
        catch {
            continue;
        }
        if (items.has(id)) continue;
        const fields = pattern.exec(node.name)?.groups;
        const artist = fields?.artist?.trim() ?? "";
        const title = fields?.title?.trim() ?? node.name;
        const valid = Boolean(artist && fields?.title?.trim());
        items.set(id, {
            id, name: node.name, url: "https://www.youtube.com/watch?v=" + id,
            artist, title, status: valid ? "available" : "invalid", progress: 0,
            message: valid ? "" : "Bookmark name does not match the configured pattern.",
            tags: { artist, albumArtist: artist, title, album: "Unknown album", genre: "Uncategorized", year: 0 },
        });
    }
    return [...items.values()];
}

export function safeDownloadName(value: string) {
    let name = value.split("").filter((character) => character.charCodeAt(0) >= 32).join("").replace(/[<>:"/\\|?*]/g, "_").trim();
    const characters = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(name), (part) => part.segment);
    while (Buffer.byteLength(characters.join("")) > 200) characters.pop();
    name = characters.join("").replace(/[. ]+$/, "");
    return name || "Song";
}
