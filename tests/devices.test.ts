import {test} from "node:test";
import {tmpdir} from "node:os";
import assert from "node:assert/strict";
import {join, basename} from "node:path";
import {setImmediate} from "node:timers/promises";
import {MtpClient} from "../src/main/services/mtp.ts";
import type {DeviceFile} from "../src/shared/types/devices.ts";
import type {DeviceTransport} from "../src/main/types/devices.ts";
import {deviceFolderSchema} from "../src/shared/schemas/devices.ts";
import {DeviceSyncService} from "../src/main/services/device-sync.ts";
import {LibraryRepository} from "../src/main/repositories/library.ts";
import {mkdtemp, mkdir, readdir, readFile, writeFile, copyFile, rm, stat, utimes} from "node:fs/promises";

const storageId = "/modules/kmtpd/device0/storage0";

async function settle(service: DeviceSyncService) {
    const deadline = Date.now() + 5000;
    while (["comparing", "syncing"].includes(service.status().phase)) {
        assert.ok(Date.now() < deadline, "Phone operation did not settle");
        await setImmediate();
    }
    // Let the task's finally handler release the operation lock.
    await setImmediate();
}

void test("USB comparison copies only missing audio and preserves phone-only and different files", async () => {
    const root = await mkdtemp(join(tmpdir(), "btunes-device-"));
    const pc = join(root, "pc");
    const phone = join(root, "phone");
    await mkdir(pc);
    await mkdir(join(phone, "Music", "Old"), { recursive: true });
    const repo = new LibraryRepository(":memory:");
    const entry = async (path: string): Promise<DeviceFile> => {
        const info = await stat(join(phone, path));
        return { name: basename(path), path, size: info.size, directory: info.isDirectory() };
    };
    const transport: DeviceTransport = {
        devices: async () => [{ id: "phone", name: "Fixture phone", storages: [{ id: storageId, name: "Internal", freeBytes: 100000 }] }],
        files: async (_id, path) => Promise.all((await readdir(join(phone, path))).map((name) => entry(path + "/" + name))),
        metadata: async (_id, path) => {
            try {
                return await entry(path);
            }
            catch (error) {
                if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
                throw error;
            }
        },
        copy: async (_id, source, path) => {
            await copyFile(source, join(phone, path));
        },
        mkdir: async (_id, path) => {
            await mkdir(join(phone, path));
        },
    };
    const sync = new DeviceSyncService(repo, transport);
    try {
        for (const [name, content] of [["Present.mp3", "already here"], ["Missing.mp3", "copy this"], ["Different.mp3", "PC version"]]) {
            const path = join(pc, name);
            await writeFile(path, content);
            const file = await stat(path);
            repo.upsert({ path, title: name, artist: "Fixture", album: "Album", genre: "Rock", year: 0, duration: 10, cover: null, size: file.size, modifiedAt: file.mtimeMs });
        }
        await writeFile(join(phone, "Music", "Old", "present.MP3"), "already here");
        await writeFile(join(phone, "Music", "Different.mp3"), "Different phone version");
        await writeFile(join(phone, "Music", "Phone only.mp3"), "keep this");
        sync.compare(storageId, "/Music");
        await settle(sync);
        assert.equal(sync.status().phase, "ready");
        assert.deepEqual(sync.status().comparison, {
            missing: 1, present: 1, different: 1, phoneOnly: 1, bytes: 9,
            preview: [{ title: "Missing.mp3", artist: "Fixture" }],
        });
        sync.sync();
        await settle(sync);
        assert.equal(sync.status().phase, "complete");
        assert.equal(sync.status().completed, 1);
        assert.equal(await readFile(join(phone, "Music", "Missing.mp3"), "utf8"), "copy this");
        assert.equal(await readFile(join(phone, "Music", "Different.mp3"), "utf8"), "Different phone version");
        assert.equal(await readFile(join(phone, "Music", "Phone only.mp3"), "utf8"), "keep this");
        sync.compare(storageId, "/Music");
        await settle(sync);
        assert.equal(sync.status().comparison?.missing, 0, "Second sync must not copy existing songs again");

        await rm(join(phone, "Music", "Missing.mp3"));
        sync.compare(storageId, "/Music");
        await settle(sync);
        await writeFile(join(pc, "Missing.mp3"), "changed since comparison");
        sync.sync();
        await settle(sync);
        assert.equal(sync.status().phase, "error");
        assert.match(sync.status().errors[0], /source file changed/);
        await assert.rejects(stat(join(phone, "Music", "Missing.mp3")), { code: "ENOENT" });
    }
    finally {
        await sync.close();
        repo.db.close();
        await rm(root, { recursive: true, force: true });
    }
});

void test("MTP uses bulk D-Bus listings and passes literal, encoded paths to KDE uploads", async () => {
    const calls: { command: string; args: string[] }[] = [];
    const client = new MtpClient(async (command, args) => {
        calls.push({ command, args });
        if (command === "kioclient") return "";
        const method = args[7];
        if (method === "listDevices") return JSON.stringify({ data: [["/modules/kmtpd/device0"]] });
        if (method === "listStorages") return JSON.stringify({ data: [[storageId]] });
        if (method === "friendlyName") return JSON.stringify({ data: "My Phone" });
        if (method === "description") return JSON.stringify({ data: "Internal storage" });
        if (method === "freeSpaceInBytes") return JSON.stringify({ data: 100000 });
        if (method === "getFilesAndFolders") return JSON.stringify({ data: [[[1, 0, 1, "AC/DC", 10, 0, "audio/mpeg"]], 0] });
        throw new Error("Unexpected command: " + args.join(" "));
    });
    await client.copy(storageId, "/tmp/Song $(touch nope).mp3", "/Music/Song #1.mp3");
    const upload = calls.find((call) => call.command === "kioclient")!;
    assert.deepEqual(upload.args, ["--noninteractive", "copy", "file:///tmp/Song%20$(touch%20nope).mp3", "mtp:/My%20Phone/Internal%20storage/Music/Song%20%231.mp3"]);
    assert.ok(!upload.args.includes("--overwrite"));
    await assert.rejects(client.files(storageId, "/Music"), /invalid filename/);
    assert.equal(deviceFolderSchema.safeParse({ storageId, path: "/Music/../Android" }).success, false);
    assert.equal(deviceFolderSchema.safeParse({ storageId: "/arbitrary/object", path: "/Music" }).success, false);
});

void test("phone matching recognizes numbered artist/album folders without copying renamed songs again", async () => {
    const { compareDeviceMusic } = await import("../src/main/services/device-matching.ts");
    const repo = new LibraryRepository(":memory:");
    try {
        repo.upsert({
            path: "/pc/Highway to Hell.mp3",
            title: "Highway To Hell",
            artist: "2Cellos",
            albumArtist: "2Cellos",
            album: "Highway to Hell",
            genre: "Rock",
            year: 0,
            duration: 120,
            cover: null,
            size: 500
        });
        const phone = [{ name: "01 - Highway To Hell.mp3", path: "/Music/2Cellos/Highway to Hell/01 - Highway To Hell.mp3", size: 500, directory: false }];
        const match = compareDeviceMusic(repo.snapshot().tracks, phone, "/Music");
        assert.equal(match.present, 1);
        assert.equal(match.missing.length, 0);
        assert.equal(match.phoneOnly, 0);
        const changed = compareDeviceMusic(repo.snapshot().tracks, [{ ...phone[0], size: 400 }], "/Music");
        assert.equal(changed.different, 1);
        assert.equal(changed.missing.length, 0, "A possible different version must not be copied as a second song");
        const alternateAlbum = compareDeviceMusic(repo.snapshot().tracks, [{ ...phone[0], path: "/Music/2Cellos/Live album/01 - Highway To Hell.mp3" }], "/Music");
        assert.equal(alternateAlbum.present, 0, "Artist and title alone must not confirm an alternate album as identical");
        assert.equal(alternateAlbum.different, 1);

        repo.upsert({ path: "/pc/one/Intro.mp3", title: "Intro", artist: "First artist", album: "First album", genre: "Rock", year: 0, duration: 120, cover: null, size: 500 });
        repo.upsert({ path: "/pc/two/Intro.mp3", title: "Intro", artist: "Second artist", album: "Second album", genre: "Rock", year: 0, duration: 120, cover: null, size: 500 });
        const collision = compareDeviceMusic(repo.snapshot().tracks.filter((track) => track.title === "Intro"), [
            { name: "Intro.mp3", path: "/Music/Intro.mp3", size: 500, directory: false },
        ], "/Music");
        assert.equal(collision.present, 0, "One phone file cannot confirm two ambiguous PC songs");
        assert.equal(collision.different, 2);
    }
    finally {
        repo.db.close();
    }
});

void test("stopping USB sync finishes the current copy and leaves subsequent songs untouched", async () => {
    const root = await mkdtemp(join(tmpdir(), "btunes-cancel-sync-"));
    const repo = new LibraryRepository(":memory:");
    let entered: () => void = () => undefined;
    let release: () => void = () => undefined;
    const copying = new Promise<void>((resolve) => {
        entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    const copied = new Set<string>();
    const transport: DeviceTransport = {
        devices: async () => [{ id: "phone", name: "Phone", storages: [{ id: storageId, name: "Internal", freeBytes: 1000 }] }],
        files: async () => [],
        metadata: async (_id, path) => copied.has(path) ? { name: basename(path), path, size: 5, directory: false } : undefined,
        copy: async (_id, _source, path) => {
            entered();
            await gate;
            copied.add(path);
        },
        mkdir: async () => undefined,
    };
    const sync = new DeviceSyncService(repo, transport);
    try {
        for (const name of ["First.mp3", "Second.mp3"]) {
            const path = join(root, name);
            await writeFile(path, "audio");
            repo.upsert({ path, title: name, artist: "Fixture", album: "Album", genre: "Rock", year: 0, duration: 10, cover: null, size: 5 });
        }
        sync.compare(storageId, "/Music");
        await settle(sync);
        sync.sync();
        await copying;
        sync.cancel();
        release();
        await settle(sync);
        assert.equal(sync.status().phase, "cancelled");
        assert.equal(sync.status().completed, 1);
        assert.equal(copied.size, 1);
    }
    finally {
        release();
        await sync.close();
        repo.db.close();
        await rm(root, { recursive: true, force: true });
    }
});

void test("USB sync detects a same-size source modification during copying", async () => {
    const root = await mkdtemp(join(tmpdir(), "btunes-sync-source-"));
    const repo = new LibraryRepository(":memory:");
    const source = join(root, "Song.mp3");
    await writeFile(source, "before");
    const original = await stat(source);
    repo.upsert({
        path: source,
        title: "Song",
        artist: "Fixture",
        album: "Album",
        genre: "Rock",
        year: 0,
        duration: 1,
        cover: null,
        size: original.size,
        modifiedAt: original.mtimeMs
    });
    let copied = false;
    const transport: DeviceTransport = {
        devices: async () => [{ id: "phone", name: "Phone", storages: [{ id: storageId, name: "Internal", freeBytes: 1000 }] }],
        files: async () => [],
        metadata: async () => copied ? { name: "Song.mp3", path: "/Music/Song.mp3", size: original.size, directory: false } : undefined,
        mkdir: async () => undefined,
        copy: async () => {
            await writeFile(source, "after!");
            await utimes(source, original.atime, new Date(original.mtimeMs + 1000));
            copied = true;
        },
    };
    const sync = new DeviceSyncService(repo, transport);
    try {
        sync.compare(storageId, "/Music");
        await settle(sync);
        sync.sync();
        await settle(sync);
        assert.equal(sync.status().phase, "error");
        assert.match(sync.status().errors[0], /source file changed/);
        assert.equal(sync.status().completed, 0);
    }
    finally {
        await sync.close();
        repo.db.close();
        await rm(root, { recursive: true, force: true });
    }
});
