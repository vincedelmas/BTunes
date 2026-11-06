import type {Track} from "../../shared/types/library.ts";
import type {DeviceFile, MusicDevice} from "../../shared/types/devices.ts";

export type CommandRunner = (command: string, args: string[], timeout?: number) => Promise<string>;

export interface DeviceTransport {
    devices: () => Promise<MusicDevice[]>;
    files: (storageId: string, path: string) => Promise<DeviceFile[]>;
    metadata: (storageId: string, path: string) => Promise<DeviceFile | undefined>;
    copy: (storageId: string, source: string, path: string) => Promise<void>;
    mkdir: (storageId: string, path: string) => Promise<void>;
}

export interface DeviceSyncPlan {
    storageId: string;
    path: string;
    tracks: Track[];
}
