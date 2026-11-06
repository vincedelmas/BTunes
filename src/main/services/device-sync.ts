import {compareDeviceMusic} from "./device-matching.ts";
import {basename, posix} from "node:path";
import {stat} from "node:fs/promises";
import {isAudioFile} from "../../shared/audio-files.ts";
import type {DeviceFile, DeviceSyncState} from "../../shared/types/devices.ts";
import type {Track} from "../../shared/types/library.ts";
import type {DeviceTransport} from "../types/devices.ts";
import type {LibraryRepository} from "../repositories/library.ts";

export class DeviceSyncService {
    private readonly repo: Pick<LibraryRepository, "snapshot">;
    readonly transport: DeviceTransport;
    private state: DeviceSyncState = { phase: "idle", completed: 0, total: 0, current: "", errors: [] };
    private task?: Promise<void>;
    private cancelled = false;
    private plan?: { storageId: string; path: string; tracks: Track[] };

    constructor(repo: Pick<LibraryRepository, "snapshot">, transport: DeviceTransport) {
        this.repo = repo;
        this.transport = transport;
    }

    status() {
        return structuredClone(this.state);
    }

    private launch(operation: () => Promise<void>) {
        if (this.task) throw new Error("A phone operation is already running.");
        this.cancelled = false;
        this.task = operation()
            .catch((error: unknown) => {
                this.state.phase = "error";
                this.state.errors.push(error instanceof Error ? error.message : String(error));
            })
            .finally(() => {
                if (this.cancelled && this.state.phase !== "error") this.state.phase = "cancelled";
                this.state.current = "";
                this.task = undefined;
            });
    }

    compare(storageId: string, path: string) {
        this.launch(async () => {
            this.plan = undefined;
            this.state = { folder: path, storageId, phase: "comparing", completed: 0, total: 0, current: path, errors: [] };
            const phoneFiles: DeviceFile[] = [];
            const folders = [path];
            while (folders.length && !this.cancelled) {
                const folder = folders.pop()!;
                this.state.current = folder;
                const entries = await this.transport.files(storageId, folder);
                for (const entry of entries) {
                    if (entry.directory) folders.push(entry.path);
                    else if (isAudioFile(entry.name)) phoneFiles.push(entry);
                }
                this.state.completed = phoneFiles.length;
            }
            if (this.cancelled) return;

            const tracks = this.repo.snapshot().tracks;
            const { missing, present, different, phoneOnly } = compareDeviceMusic(tracks, phoneFiles, path);

            this.plan = { storageId, path, tracks: missing };
            this.state = {
                folder: path, storageId, phase: "ready", completed: 0, total: missing.length, current: "", errors: [],
                comparison: {
                    missing: missing.length, present, different,
                    phoneOnly,
                    bytes: missing.reduce((total, track) => total + track.size, 0),
                    preview: missing.slice(0, 20).map((track) => ({ title: track.title, artist: track.artist })),
                },
            };
        });
    }

    sync() {
        const plan = this.plan;
        if (this.state.phase !== "ready" || !plan) throw new Error("Compare your library and phone first.");

        this.launch(async () => {
            this.state.phase = "syncing";
            this.state.completed = 0;
            const devices = await this.transport.devices();
            const storage = devices.flatMap((device) => device.storages).find((storage) => storage.id === plan.storageId);
            if (!storage) throw new Error("The selected phone is no longer connected.");
            if (storage.freeBytes < (this.state.comparison?.bytes ?? 0)) throw new Error("There is not enough free space on the phone.");
            for (const track of plan.tracks) {
                if (this.cancelled) break;
                this.state.current = track.title;
                const destination = posix.join(plan.path, basename(track.path));
                const source = await stat(track.path);
                if (source.size !== track.size || (track.modifiedAt && source.mtimeMs !== track.modifiedAt)) {
                    throw new Error("A source file changed. Compare again: " + track.title);
                }
                if (await this.transport.metadata(plan.storageId, destination)) {
                    throw new Error("A file appeared on the phone. Compare again: " + track.title);
                }
                await this.transport.copy(plan.storageId, track.path, destination);
                const written = await this.transport.metadata(plan.storageId, destination);
                if (!written || written.size !== source.size) throw new Error("Could not verify the transferred file: " + track.title);
                this.state.completed++;
                if (this.state.comparison) {
                    this.state.comparison.missing--;
                    this.state.comparison.present++;
                    this.state.comparison.bytes -= track.size;
                }
            }
            this.plan = undefined;
            if (!this.cancelled) this.state.phase = "complete";
        });
    }

    cancel() {
        this.cancelled = true;
    }

    async close() {
        this.cancel();
        await this.task;
    }
}
