interface DeviceStorage {
    id: string;
    name: string;
    freeBytes: number;
}

export interface MusicDevice {
    id: string;
    name: string;
    storages: DeviceStorage[];
}

export interface DeviceFile {
    name: string;
    path: string;
    size: number;
    directory: boolean;
}

interface DeviceComparison {
    missing: number;
    present: number;
    different: number;
    phoneOnly: number;
    bytes: number;
    preview: { title: string; artist: string }[];
}

export interface DeviceSyncState {
    folder?: string;
    storageId?: string;
    phase: "idle" | "comparing" | "ready" | "syncing" | "complete" | "cancelled" | "error";
    completed: number;
    total: number;
    current: string;
    comparison?: DeviceComparison;
    errors: string[];
}
