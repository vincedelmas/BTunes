import type {Track} from "../../../shared/contracts";

export function formatTime(seconds: number) {
    const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);

    return (
        Math.floor(safeSeconds / 60) +
        ":" +
        String(Math.floor(safeSeconds % 60)).padStart(2, "0")
    );
}

export function duplicateKey(track: Track) {
    return [track.title, track.artist, Math.round(track.duration)]
        .join("|")
        .toLowerCase();
}

export function groupAlbums(tracks: Track[]) {
    const albums = new Map<string, Track[]>();

    for (const track of tracks) {
        const key = track.artist + "\0" + track.album;
        const album = albums.get(key) ?? [];
        album.push(track);
        albums.set(key, album);
    }

    return [...albums.values()];
}

export function uniqueValues(tracks: Track[], field: "artist" | "genre") {
    return [...new Set(tracks.map((track) => track[field]))].sort();
}

export function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}
