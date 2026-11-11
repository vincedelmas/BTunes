import {posix} from "node:path";
import {pathToFileURL} from "node:url";
import {runCommand} from "./commands.ts";
import type {CommandRunner, DeviceTransport} from "../types/devices.ts";
import type {DeviceFile, MusicDevice} from "../../shared/types/devices.ts";
import {
    deviceFolderSchema,
    mtpBytesSchema,
    mtpCallResponseSchema,
    mtpFileSchema,
    mtpFilesSchema,
    mtpNameSchema,
    mtpPathsSchema,
    mtpResponseSchema
} from "../../shared/schemas/devices.ts";

const service = "org.kde.kmtpd5";
const daemonPath = "/modules/kmtpd";
const deviceInterface = "org.kde.kmtp.Device";
const storageInterface = "org.kde.kmtp.Storage";

export class MtpClient implements DeviceTransport {
    private readonly run: CommandRunner;
    private roots = new Map<string, string>();

    constructor(run: CommandRunner = runCommand) {
        this.run = run;
    }

    private async call(path: string, iface: string, method: string, args: string[] = []) {
        const output = await this.run("busctl", ["--user", "--timeout=25s", "--json=short", "call", service, path, iface, method, ...args]);
        return mtpCallResponseSchema.parse(JSON.parse(output)).data;
    }

    private async property(path: string, iface: string, name: string) {
        const output = await this.run("busctl", ["--user", "--timeout=25s", "--json=short", "get-property", service, path, iface, name]);
        return mtpResponseSchema.parse(JSON.parse(output)).data;
    }

    async devices(): Promise<MusicDevice[]> {
        const paths = mtpPathsSchema.parse((await this.call(daemonPath, "org.kde.kmtp.Daemon", "listDevices"))[0]);
        const devices: MusicDevice[] = [];
        const roots = new Map<string, string>();
        for (const path of paths) {
            const name = mtpNameSchema.parse(await this.property(path, deviceInterface, "friendlyName"));
            const storagePaths = mtpPathsSchema.parse((await this.call(path, deviceInterface, "listStorages"))[0]);
            const storages = [];
            for (const storage of storagePaths) {
                const storageName = mtpNameSchema.parse(await this.property(storage, storageInterface, "description"));
                roots.set(storage, "mtp:/" + [name, storageName].map(encodeURIComponent).join("/"));
                storages.push({
                    id: storage,
                    name: storageName,
                    freeBytes: mtpBytesSchema.parse(await this.property(storage, storageInterface, "freeSpaceInBytes")),
                });
            }
            devices.push({ id: path, name, storages });
        }
        this.roots = roots;
        return devices;
    }

    private entry(data: ReturnType<typeof mtpFileSchema.parse>, parent: string): DeviceFile {
        const name = data[3];
        if (!name || name === "." || name === ".." || name.includes("/") || name.includes("\0")) {
            throw new Error("The phone returned an invalid filename.");
        }
        return { name, path: posix.join(parent, name), size: data[4], directory: data[6] === "inode/directory" };
    }

    async files(storageId: string, path: string) {
        deviceFolderSchema.parse({ storageId, path });
        const [entries, result] = mtpFilesSchema.parse(await this.call(storageId, storageInterface, "getFilesAndFolders", ["s", path]));
        if (result !== 0) throw new Error("Cannot read this phone folder. Check that the phone is connected and unlocked.");
        return entries.map((entry) => this.entry(entry, path));
    }

    async metadata(storageId: string, path: string) {
        deviceFolderSchema.parse({ storageId, path });
        const entry = mtpFileSchema.parse((await this.call(storageId, storageInterface, "getFileMetadata", ["s", path]))[0]);
        if (!entry[0]) return undefined;
        return this.entry(entry, posix.dirname(path));
    }

    async mkdir(storageId: string, path: string) {
        deviceFolderSchema.parse({ storageId, path });
        const [result] = await this.call(storageId, storageInterface, "createFolder", ["s", path]);
        if (typeof result !== "number" || result <= 0) throw new Error("Could not create the music folder on the phone.");
    }

    async copy(storageId: string, source: string, path: string) {
        deviceFolderSchema.parse({ storageId, path });
        // KDE handles the MTP upload and closes it before the command returns. No shell or overwrite flag.
        if (!this.roots.has(storageId)) await this.devices();
        const root = this.roots.get(storageId);
        if (!root) throw new Error("The selected phone is no longer connected.");
        const destination = root + "/" + path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
        await this.run("kioclient", ["--noninteractive", "copy", pathToFileURL(source).href, destination], 15 * 60 * 1000);
    }
}
