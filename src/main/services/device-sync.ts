import {tmpdir} from "node:os";
import {join, basename, posix} from "node:path";
import {getErrorMessage} from "../../shared/errors.ts";
import {compareDeviceMusic} from "./device-matching.ts";
import {isAudioFile} from "../../shared/audio-files.ts";
import {mkdtemp, rm, stat, writeFile} from "node:fs/promises";
import type {LibraryRepository} from "../repositories/library.ts";
import type {DeviceSyncPlan, DeviceTransport, DevicePlaylistPlan} from "../types/devices.ts";
import type {DeviceFile, DeviceSyncState} from "../../shared/types/devices.ts";

export class DeviceSyncService {
    private readonly repo: Pick<LibraryRepository, "snapshot" | "playlist">;
    readonly transport: DeviceTransport;
    private state: DeviceSyncState = { phase: "idle", completed: 0, total: 0, current: "", errors: [] };
    private task?: Promise<void>;
    private cancelled = false;
    private plan?: DeviceSyncPlan;

    constructor(repo: Pick<LibraryRepository, "snapshot" | "playlist">, transport: DeviceTransport) {
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
                this.state.errors.push(getErrorMessage(error));
            })
            .finally(() => {
                if (this.cancelled && this.state.phase !== "error") this.state.phase = "cancelled";
                this.state.current = "";
                this.task = undefined;
            });
    }

    compare(storageId: string, path: string, playlistIds: number[] = []) {
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

            const snapshot = this.repo.snapshot();
            const tracks = snapshot.tracks;
            const { paths, missing, present, different, phoneOnly } = compareDeviceMusic(tracks, phoneFiles, path);
            for (const track of missing) paths.set(track.id, posix.join(path, basename(track.path)));

            const tracksById = new Map(tracks.map((track) => [track.id, track]));
            const playlistsById = new Map(snapshot.playlists.map((playlist) => [playlist.id, playlist]));

            const playlists = [...new Set(playlistIds)].map((id) => {
                const playlist = playlistsById.get(id);
                if (!playlist) throw new Error("A selected playlist no longer exists. Compare again.");

                const references = this.repo.playlist(id).map((trackId) => {
                    const track = tracksById.get(trackId);
                    const destination = paths.get(trackId);
                    if (!track || !destination) {
                        throw new Error("Cannot export " + playlist.name + ": unresolved or ambiguous song " + (track?.title ?? trackId));
                    }
                    if (/[\r\n\\]/u.test(destination)) throw new Error("Unsupported playlist path: " + destination);
                    return { path: destination, size: track.size };
                });
                // IDs avoid collisions and keep the same destination when a playlist is renamed.
                const destination = posix.join(path, "BTunes-" + id + ".m3u8");
                const title = playlist.name.replace(/[\r\n]/gu, " ");
                const entries = references.map((reference) => "./" + posix.relative(path, reference.path));
                const content = ["#EXTM3U", "#PLAYLIST:" + title, ...entries, ""].join("\n");
                return { path: destination, content, references };
            });

            this.plan = { storageId, path, tracks: missing, playlists, revision: snapshot.revision };
            this.state = {
                playlists: playlists.length, playlistsCompleted: 0,
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

        if (this.repo.snapshot().revision !== plan.revision) {
            throw new Error("Your library changed. Compare again before syncing.");
        }

        this.launch(async () => {
            this.state.phase = "syncing";
            this.state.completed = 0;
            const devices = await this.transport.devices();
            const storage = devices.flatMap((device) => device.storages).find((storage) => storage.id === plan.storageId);
            if (!storage) throw new Error("The selected phone is no longer connected.");
            const playlistBytes = plan.playlists.reduce((total, playlist) => total + Buffer.byteLength(playlist.content), 0);
            if (storage.freeBytes < (this.state.comparison?.bytes ?? 0) + playlistBytes) throw new Error("There is not enough free space on the phone.");
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
                const after = await stat(track.path);
                if (after.dev !== source.dev || after.ino !== source.ino || after.size !== source.size || after.mtimeMs !== source.mtimeMs) {
                    throw new Error("A source file changed during the copy. Compare again: " + track.title);
                }
                const written = await this.transport.metadata(plan.storageId, destination);
                if (!written || written.size !== source.size) throw new Error("Could not verify the transferred file: " + track.title);
                this.state.completed++;
                if (this.state.comparison) {
                    this.state.comparison.missing--;
                    this.state.comparison.present++;
                    this.state.comparison.bytes -= track.size;
                }
            }

            for (const playlist of plan.playlists) {
                if (this.cancelled) break;
                await this.exportPlaylist(plan.storageId, playlist);
            }
            this.plan = undefined;
            if (!this.cancelled) this.state.phase = "complete";
        });
    }

    private async exportPlaylist(storageId: string, playlist: DevicePlaylistPlan) {
        this.state.current = posix.basename(playlist.path);

        for (const reference of playlist.references) {
            const file = await this.transport.metadata(storageId, reference.path);
            if (!file || file.directory || file.size !== reference.size) {
                throw new Error("A playlist song changed on the phone. Compare again: " + reference.path);
            }
        }
        if (this.cancelled) return;

        const existing = await this.transport.metadata(storageId, playlist.path);
        if (existing?.directory) throw new Error("A folder blocks playlist export: " + playlist.path);
        const temporary = await mkdtemp(join(tmpdir(), "btunes-playlist-"));

        try {
            const source = join(temporary, "playlist.m3u8");
            await writeFile(source, playlist.content, "utf8");
            await this.transport.copy(storageId, source, playlist.path, Boolean(existing));

            const written = await this.transport.metadata(storageId, playlist.path);
            if (!written || written.size !== Buffer.byteLength(playlist.content)) {
                throw new Error("Could not verify the transferred playlist: " + playlist.path);
            }
            this.state.playlistsCompleted = (this.state.playlistsCompleted ?? 0) + 1;
        }
        finally {
            await rm(temporary, { recursive: true, force: true });
        }
    }

    cancel() {
        this.cancelled = true;
    }

    async close() {
        this.cancel();
        await this.task;
    }
}
