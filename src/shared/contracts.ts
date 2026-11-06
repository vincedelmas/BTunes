import type {TagPatch, TagPreview, TagSaveResult} from "./tags";

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
type PlaylistMutation =
    | { playlistId: number; trackId: number }
    | { playlistId: number; trackIds: number[] };

type Routes = {
    "tags.preview": {
        input: { ids: number[]; patch: TagPatch };
        output: TagPreview;
    };
    "tags.save": { input: { token: string }; output: TagSaveResult };
    "library.get": { input: { revision: number } | undefined; output: Snapshot | null };
    "library.import": {
        input: undefined;
        output: { imported: number; errors: string[] } | null;
    };
    "track.reveal": { input: { id: number }; output: void };
    "playlist.remove": { input: PlaylistMutation; output: void };
    "track.favorite": { input: { id: number }; output: void };
    "track.played": { input: { id: number }; output: void };
    "playlist.create": { input: { name: string; rule?: string }; output: number };
    "playlist.add": {
        input: PlaylistMutation;
        output: void;
    };
    "playlist.tracks": { input: { id: number }; output: number[] };
};
export type Rpc = <K extends keyof Routes>(
    method: K,
    input: Routes[K]["input"],
) => Promise<Routes[K]["output"]>;
declare global {
    interface Window {
        btunes: { rpc: Rpc };
    }
}
