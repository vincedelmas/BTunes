import {test} from "node:test";
import {join} from "node:path";
import {tmpdir} from "node:os";
import assert from "node:assert/strict";
import {parseFile} from "music-metadata";
import {execFileSync} from "node:child_process";
import {LibraryService} from "../src/main/services/library.ts";
import {LibraryRepository} from "../src/main/repositories/library.ts";
import {copyFile, mkdir, mkdtemp, readdir, rename, rm, stat, utimes, writeFile} from "node:fs/promises";

function deferred() {
    let release: () => void = () => undefined;
    const promise = new Promise<void>((resolve) => {
        release = resolve;
    });
    return { promise, resolve: () => release() };
}

function audio(path: string, title = "Before") {
    execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=8000:cl=mono", "-t", "0.1", "-metadata", "title=" + title, path]);
}

void test("reconciliation finds offline changes, skips unchanged audio, and preserves unavailable folders", async () => {
    const root = await mkdtemp(join(tmpdir(), "btunes-reconcile-"));
    const music = join(root, "music");
    await mkdir(music);
    const file = join(root, "library.sqlite");
    let library = new LibraryService(new LibraryRepository(file), join(root, "covers"));

    try {
        audio(join(music, "a.flac"));
        await copyFile(join(music, "a.flac"), join(music, "b.flac"));
        await library.scan(music);
        const id = library.repo.snapshot().tracks.find((track) => track.path.endsWith("a.flac"))!.id;
        library.repo.played(id);
        await library.close();

        audio(join(music, "a.flac"), "Changed offline");
        await rm(join(music, "b.flac"));
        await copyFile(join(music, "a.flac"), join(music, "c.flac"));
        let reads = 0;
        library = new LibraryService(new LibraryRepository(file), join(root, "covers"), async (path) => {
            reads++;
            return parseFile(path);
        });
        assert.deepEqual((await library.reconcile()).errors, []);
        assert.equal(reads, 2);
        assert.equal(library.repo.get(id)?.title, "Changed offline");
        assert.equal(library.repo.get(id)?.plays, 1);
        assert.equal(library.repo.snapshot().tracks.length, 2);
        await library.reconcile();
        assert.equal(reads, 2, "Unchanged files should not be parsed again");

        await rename(music, join(root, "disconnected"));
        await mkdir(music);
        assert.deepEqual((await library.reconcile()).errors, [music]);
        await library.remove(join(music, "a.flac"));
        assert.equal(library.repo.snapshot().tracks.length, 2, "An empty replacement mount point must not erase songs");
    }
    finally {
        await library.close();
        await rm(root, { recursive: true, force: true });
    }
});

void test("shutdown drains an in-flight import and refuses new work", async () => {
    const root = await mkdtemp(join(tmpdir(), "btunes-shutdown-"));
    const music = join(root, "music");
    await mkdir(music);
    audio(join(music, "a.flac"));
    for (const name of ["b", "c", "d", "e"]) {
        await copyFile(join(music, "a.flac"), join(music, name + ".flac"));
    }
    const entered = deferred();
    const gate = deferred();
    const file = join(root, "library.sqlite");
    let started = 0;
    const library = new LibraryService(new LibraryRepository(file), join(root, "covers"), async (path) => {
        if (++started === 4) entered.resolve();
        await gate.promise;
        return parseFile(path);
    });

    try {
        const importing = library.scan(music);
        await entered.promise;
        const closing = library.close();
        assert.equal(started, 4, "Only four metadata readers should run at a time");
        await assert.rejects(library.scan(music), /shutting down/);
        await assert.rejects(library.index(join(music, "b.flac")), /shutting down/);
        gate.resolve();
        await importing;
        await closing;
        const reopened = new LibraryRepository(file);
        assert.equal(reopened.snapshot().tracks.length, 4);
        reopened.db.close();
    }
    finally {
        gate.resolve();
        await library.close();
        await rm(root, { recursive: true, force: true });
    }
});

void test("deleting a song during indexing cannot resurrect its database entry", async () => {
    const root = await mkdtemp(join(tmpdir(), "btunes-unlink-"));
    const path = join(root, "song.flac");
    audio(path);
    const entered = deferred();
    const gate = deferred();
    let pause = false;
    const library = new LibraryService(new LibraryRepository(":memory:"), join(root, "covers"), async (file) => {
        const metadata = await parseFile(file);
        if (pause) {
            entered.resolve();
            await gate.promise;
        }
        return metadata;
    });

    try {
        await library.index(path);
        pause = true;
        const indexing = library.index(path);
        const failedIndex = assert.rejects(indexing, /ENOENT/);
        await entered.promise;
        await rm(path);
        const removing = library.remove(path);
        gate.resolve();
        await failedIndex;
        await removing;
        assert.equal(library.repo.snapshot().tracks.length, 0);
    }
    finally {
        gate.resolve();
        await library.close();
        await rm(root, { recursive: true, force: true });
    }
});

void test("shared artwork is written once and reconciliation prunes only unreferenced cache files", async () => {
    const root = await mkdtemp(join(tmpdir(), "btunes-covers-"));
    const music = join(root, "music");
    const covers = join(root, "covers");
    await mkdir(music);
    const first = join(music, "a.flac");
    const second = join(music, "b.flac");
    audio(first);
    await copyFile(first, second);

    const library = new LibraryService(new LibraryRepository(":memory:"), covers, async (path) => {
        const metadata = await parseFile(path);
        metadata.common.picture = [{ format: "image/jpeg", data: Buffer.from("shared artwork") }];
        return metadata;
    });

    try {
        assert.equal((await library.scan(music)).imported, 2);
        const [hash] = await readdir(covers);
        assert.match(hash, /^[a-f0-9]{64}$/);
        const cover = join(covers, hash);
        await utimes(cover, 1000, 1000);
        await library.index(first);
        assert.equal((await stat(cover)).mtimeMs, 1000000, "Reindexing a shared cover should reuse the cached file");

        const orphan = "f".repeat(64);
        await writeFile(join(covers, orphan), "orphan");
        await writeFile(join(covers, "other.txt"), "unmanaged");

        await rm(first);
        await library.reconcile();
        assert.deepEqual((await readdir(covers)).sort(), [hash, "other.txt"].sort());

        await rm(second);
        await library.reconcile();
        assert.deepEqual(await readdir(covers), ["other.txt"]);
    }
    finally {
        await library.close();
        await rm(root, { recursive: true, force: true });
    }
});
