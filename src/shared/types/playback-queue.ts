import type {Track} from "./library.ts";


export interface QueuedTrack {
    key: number;
    track: Track;
}

export interface PlaybackQueue {
    entries: QueuedTrack[];
    index: number;
}
