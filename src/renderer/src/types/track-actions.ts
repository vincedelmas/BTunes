import type {Track} from "../../../shared/types/library";


export interface TrackActions {
    onEdit: (tracks: Track[]) => void;
    onError: (message: string) => void;
    onArtist: (artist: string) => void;
    onRemove?: (trackIds: number[]) => void;
    onPlay: (track: Track, tracks?: Track[]) => void;
    onAdd: (playlistId: number, trackIds: number[]) => void;
    onEnqueue: (tracks: Track[], playNext?: boolean) => void;
}
