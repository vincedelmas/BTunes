export type Track = {
    id: number;
    path: string;
    title: string;
    artist: string;
    album: string;
    genre: string;
    year: number;
    duration: number;
    favorite: number;
    plays: number;
    lastPlayed: number;
    cover: string | null;
    size: number;
};
export type Playlist = { id: number; name: string; rule: string | null };
export type Snapshot = {
    revision: number;
    tracks: Track[];
    playlists: Playlist[];
    folders: string[];
};

export type IndexedTrack = Omit<Track, "id" | "favorite" | "plays" | "lastPlayed">;
