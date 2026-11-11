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
    bytes: number;
    missing: number;
    present: number;
    different: number;
    phoneOnly: number;
    preview: { title: string; artist: string }[];
}

export interface DeviceSyncState {
    total: number;
    folder?: string;
    current: string;
    errors: string[];
    completed: number;
    storageId?: string;
    comparison?: DeviceComparison;
    phase: "idle" | "comparing" | "ready" | "syncing" | "complete" | "cancelled" | "error";
}
