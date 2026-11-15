import type {Track} from "../../shared/types/library.ts";
import type {DeviceFile, MusicDevice} from "../../shared/types/devices.ts";

export type CommandRunner = (command: string, args: string[], timeout?: number) => Promise<string>;

export interface DeviceTransport {
    devices: () => Promise<MusicDevice[]>;
    mkdir: (storageId: string, path: string) => Promise<void>;
    files: (storageId: string, path: string) => Promise<DeviceFile[]>;
    metadata: (storageId: string, path: string) => Promise<DeviceFile | undefined>;
    copy: (storageId: string, source: string, path: string, overwrite?: boolean) => Promise<void>;
}

export interface DeviceSyncPlan {
    path: string;
    tracks: Track[];
    revision: number;
    storageId: string;
    playlists: DevicePlaylistPlan[];
}


export interface DevicePlaylistPlan {
    name: string;
    path: string;
    content: string;
    references: { path: string; size: number }[];
}
