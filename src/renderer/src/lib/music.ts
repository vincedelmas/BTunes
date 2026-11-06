import type {Track} from "../../../shared/types/library.ts";


export const getAlbumArtist = (track: Track) => {
    return track.albumArtist || track.artist;
}


export const albumKey = (track: Track) => {
    return getAlbumArtist(track) + "\0" + track.album;
}


export const formatTime = (seconds: number) => {
    const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    return (Math.floor(safeSeconds / 60) + ":" + String(Math.floor(safeSeconds % 60)).padStart(2, "0"));
};


export const duplicateKey = (track: Track) => {
    return [track.title, track.artist, Math.round(track.duration)].join("|").toLowerCase();
}


export const groupAlbums = (tracks: Track[]) => {
    const albums = new Map<string, Track[]>();

    for (const track of tracks) {
        const key = albumKey(track);
        const album = albums.get(key) ?? [];

        album.push(track);
        albums.set(key, album);
    }

    return [...albums.values()];
};


export const uniqueValues = (tracks: Track[], field: "artist" | "genre") => {
    return [...new Set(tracks.map((track) => track[field]))].sort();
}


export const getErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : String(error);
}
