import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtemp, mkdir, readFile, writeFile, rm, stat} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {LibraryRepository} from "../src/main/repositories/library.ts";
import {LibraryService} from "../src/main/services/library.ts";
import {FileImportService} from "../src/main/services/file-import.ts";

void test("dropped music copies or moves without overwriting files, and appears in the library", async () => {
    const root = await mkdtemp(join(tmpdir(), "btunes-drop-"));
    const music = join(root, "music");
    const downloads = join(root, "downloads");
    await mkdir(music);
    await mkdir(downloads);
    const library = new LibraryService(new LibraryRepository(":memory:"), join(root, "covers"));

    try {
        const source = join(downloads, "Song.mp3");
        execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "anullsrc=r=8000:cl=mono", "-t", "0.2", source]);
        const original = await readFile(source);
        await writeFile(join(music, "Song.mp3"), original);
        await library.scan(music);
        const importer = new FileImportService(library);
        const copied = await importer.import([source, source], { folder: music, operation: "copy" });
        assert.deepEqual(copied, { imported: 1, skipped: 0, errors: [] });
        assert.deepEqual(await readFile(source), original);
        assert.deepEqual(await readFile(join(music, "Song.mp3")), original);
        assert.deepEqual(await readFile(join(music, "Song (2).mp3")), original);
        const moved = await importer.import([source], { folder: music, operation: "move" });
        assert.equal(moved.imported, 1);
        await assert.rejects(stat(source), { code: "ENOENT" });
        assert.deepEqual(await readFile(join(music, "Song (3).mp3")), original);
        assert.equal(library.repo.snapshot().tracks.length, 3);
        assert.equal((await importer.import([join(music, "Song.mp3")], { folder: music, operation: "copy" })).skipped, 1);
    }
    finally {
        await library.close();
        await rm(root, { recursive: true, force: true });
    }
});

void test("failed indexing keeps a move source and removes its incomplete library copy", async () => {
    const root = await mkdtemp(join(tmpdir(), "btunes-drop-failure-"));
    const music = join(root, "music");
    await mkdir(music);
    const repo = new LibraryRepository(":memory:");
    repo.folder(music);
    const source = join(root, "Song.mp3");
    await writeFile(source, "Original audio");
    const importer = new FileImportService({
        repo,
        index: async () => {
            throw new Error("Invalid audio");
        },
        remove: async (path) => {
            repo.remove(path);
        },
    });
    try {
        const result = await importer.import([source], { folder: music, operation: "move" });
        assert.equal(result.imported, 0);
        assert.equal(result.errors[0].message, "Invalid audio");
        assert.equal(await readFile(source, "utf8"), "Original audio");
        await assert.rejects(stat(join(music, "Song.mp3")), { code: "ENOENT" });
        await assert.rejects(importer.import([source], { folder: root, operation: "copy" }), /configured music folder/);
    }
    finally {
        repo.db.close();
        await rm(root, { recursive: true, force: true });
    }
});
