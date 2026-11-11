export type Playlist = { id: number; name: string; rule: string | null };
export type IndexedTrack = Omit<Track, "id" | "favorite" | "plays" | "lastPlayed" | "albumArtist"> & { albumArtist?: string };


export type Track = {
    id: number;
    path: string;
    year: number;
    size: number;
    title: string;
    album: string;
    genre: string;
    plays: number;
    artist: string;
    duration: number;
    favorite: number;
    lastPlayed: number;
    modifiedAt?: number;
    albumArtist: string;
    cover: string | null;
};


export type Snapshot = {
    tracks: Track[];
    revision: number;
    folders: string[];
    playlists: Playlist[];
};
