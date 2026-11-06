import {basename, extname, posix} from "node:path";
import type {DeviceFile} from "../../shared/types/devices.ts";
import type {Track} from "../../shared/types/library.ts";

const filenameKey = (name: string) => name.normalize("NFC").toLocaleLowerCase();
const musicKey = (value: string) => value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const artistTitleKey = (artist: string, title: string) => "artist:" + musicKey(artist) + ":" + musicKey(title);
const albumTitleKey = (artist: string, album: string, title: string) => "album:" + musicKey(artist) + ":" + musicKey(album) + ":" + musicKey(title);

function phoneKeys(file: DeviceFile, root: string) {
    const keys = ["file:" + filenameKey(file.name)];
    const stem = basename(file.name, extname(file.name));
    const titles = new Set([stem, stem.replace(/^(?:\d{1,3}[\s._-]+)+/, "")]);
    const folders = posix.relative(root, posix.dirname(file.path)).split("/").filter(Boolean);
    const artist = folders[0];
    const album = folders[1];

    for (const title of titles) {
        keys.push("credit:" + musicKey(title));
        if (artist) keys.push(artistTitleKey(artist, title));
        if (artist && album) keys.push(albumTitleKey(artist, album, title));
    }
    return keys;
}

function trackKeys(track: Track) {
    const keys = ["file:" + filenameKey(basename(track.path))];
    const artists = new Set([track.albumArtist || track.artist, track.artist]);
    for (const artist of artists) {
        keys.push(albumTitleKey(artist, track.album, track.title));
        keys.push(artistTitleKey(artist, track.title));
        keys.push("credit:" + musicKey(artist + track.title));
        keys.push("credit:" + musicKey(artist + track.album + track.title));
    }
    return keys;
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

    const missing: Track[] = [];
    const filenames = new Map<string, Track[]>();
    let present = 0;
    let different = 0;
    for (const track of tracks) {
        const matches = new Set(trackKeys(track).flatMap((key) => phoneIndex.get(key) ?? []));
        for (const file of matches) matched.add(file);
        if ([...matches].some((file) => file.size === track.size)) present++;
        else if (matches.size) different++;
        else {
            const key = filenameKey(basename(track.path));
            const conflicts = filenames.get(key) ?? [];
            conflicts.push(track);
            filenames.set(key, conflicts);
        }
    }

    for (const versions of filenames.values()) {
        // A flat destination cannot safely distinguish two PC files with the same name.
        if (versions.length > 1) different += versions.length;
        else missing.push(versions[0]);
    }
    return { missing, present, different, phoneOnly: phoneFiles.filter((file) => !matched.has(file)).length };
}
