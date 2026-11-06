import {basename, extname, posix} from "node:path";
import type {DeviceFile} from "../../shared/types/devices.ts";
import type {Track} from "../../shared/types/library.ts";

const filenameKey = (name: string) => name.normalize("NFC").toLocaleLowerCase();
const musicKey = (value: string) => value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const artistTitleKey = (artist: string, title: string) => "artist:" + musicKey(artist) + ":" + musicKey(title);
const albumTitleKey = (artist: string, album: string, title: string) => "album:" + musicKey(artist) + ":" + musicKey(album) + ":" + musicKey(title);

function phoneKeys(file: DeviceFile, root: string) {
    const keys: string[] = [];
    const stem = basename(file.name, extname(file.name));
    const titles = new Set([stem, stem.replace(/^(?:\d{1,3}[\s._-]+)+/, "")]);
    const folders = posix.relative(root, posix.dirname(file.path)).split("/").filter(Boolean);
    const artist = folders[0];
    const album = folders[1];
    // Artist/album folders identify a recording more precisely than a shared filename.
    if (folders.length < 2) keys.push("file:" + filenameKey(file.name));

    for (const title of titles) {
        keys.push("credit:" + musicKey(title));
        if (artist) keys.push(artistTitleKey(artist, title));
        if (artist && album) keys.push(albumTitleKey(artist, album, title));
    }
    return keys;
}

function trackKeys(track: Track) {
    const strong = ["file:" + filenameKey(basename(track.path))];
    const weak: string[] = [];
    const artists = new Set([track.albumArtist || track.artist, track.artist]);

    for (const artist of artists) {
        strong.push(albumTitleKey(artist, track.album, track.title));
        strong.push("credit:" + musicKey(artist + track.album + track.title));
        weak.push(artistTitleKey(artist, track.title));
        weak.push("credit:" + musicKey(artist + track.title));
    }
    return { strong, weak };
}

export function compareDeviceMusic(tracks: Track[], phoneFiles: DeviceFile[], root: string) {
    const phoneIndex = new Map<string, DeviceFile[]>();
    const matched = new Set<DeviceFile>();
    for (const file of phoneFiles) {
        for (const key of phoneKeys(file, root)) {
            const files = phoneIndex.get(key) ?? [];
            files.push(file);
            phoneIndex.set(key, files);
        }
    }

    const nameCounts = new Map<string, number>();
    for (const track of tracks) {
        const name = filenameKey(basename(track.path));
        nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    }

    const missing: Track[] = [];
    let present = 0;
    let different = 0;

    for (const track of tracks) {
        const keys = trackKeys(track);
        const strong = new Set(keys.strong.flatMap((key) => phoneIndex.get(key) ?? []));
        const weak = new Set(keys.weak.flatMap((key) => phoneIndex.get(key) ?? []));
        for (const file of [...strong, ...weak]) matched.add(file);

        // A flat destination cannot safely distinguish two PC files with the same name.
        if ((nameCounts.get(filenameKey(basename(track.path))) ?? 0) > 1) different++;
        else if ([...strong].some((file) => file.size === track.size)) present++;
        else if (strong.size || weak.size) different++;
        else missing.push(track);
    }

    return { missing, present, different, phoneOnly: phoneFiles.filter((file) => !matched.has(file)).length };
}
