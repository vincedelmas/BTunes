import {safeFilename} from "./filenames.ts";
import type {Playlist} from "./types/library.ts";

const filenameKey = (value: string) => value.normalize("NFC").toLocaleLowerCase();

export function playlistFilenames(playlists: Playlist[]) {
    const names = playlists.map((playlist) => safeFilename(playlist.name, "Playlist"));
    const reserved = new Set(names.map((name) => filenameKey(name + ".m3u8")));
    const counts = new Map<string, number>();
    const filenames = new Map<number, string>();
    const used = new Set<string>();

    for (const name of names) {
        const key = filenameKey(name);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    for (const [index, playlist] of playlists.entries()) {
        const name = names[index]!;
        let filename = name + ".m3u8";

        if (counts.get(filenameKey(name))! > 1) {
            let suffix = 0;
            do {
                const identifier = suffix ? playlist.id + "-" + suffix : String(playlist.id);
                filename = name + " (" + identifier + ").m3u8";
                suffix++;
            } while (reserved.has(filenameKey(filename)) || used.has(filenameKey(filename)));
        }

        used.add(filenameKey(filename));
        filenames.set(playlist.id, filename);
    }

    return filenames;
}
