export type Track = { id: number; path: string; title: string; artist: string; album: string; genre: string; year: number; duration: number; favorite: number; plays: number; lastPlayed: number; cover: string | null; size: number }
export type Playlist = { id: number; name: string; rule: string | null }
export type Snapshot = { tracks: Track[]; playlists: Playlist[]; folders: string[] }
export type Routes = {
 'library.get': { input: undefined; output: Snapshot };
 'library.import': { input: undefined; output: { imported: number; errors: string[] } | null };
 'track.favorite': { input: { id: number }; output: void };
 'track.played': { input: { id: number }; output: void };
 'playlist.create': { input: { name: string; rule?: string }; output: number };
 'playlist.add': { input: { playlistId: number; trackId: number }; output: void };
 'playlist.tracks': { input: { id: number }; output: number[] };
}
export type Rpc = <K extends keyof Routes>(method: K, input: Routes[K]['input']) => Promise<Routes[K]['output']>
declare global { interface Window { sillage: { rpc: Rpc } } }
