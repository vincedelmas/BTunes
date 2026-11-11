import type {Track} from "../../shared/types/library.ts";
import type {DeviceFile, MusicDevice} from "../../shared/types/devices.ts";

export type CommandRunner = (command: string, args: string[], timeout?: number) => Promise<string>;

export interface DeviceTransport {
    devices: () => Promise<MusicDevice[]>;
    mkdir: (storageId: string, path: string) => Promise<void>;
    files: (storageId: string, path: string) => Promise<DeviceFile[]>;
    copy: (storageId: string, source: string, path: string) => Promise<void>;
    metadata: (storageId: string, path: string) => Promise<DeviceFile | undefined>;
}

export interface DeviceSyncPlan {
    path: string;
    tracks: Track[];
    storageId: string;
}
