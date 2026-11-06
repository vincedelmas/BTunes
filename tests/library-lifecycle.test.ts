import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtemp, mkdir, rename, copyFile, rm} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {parseFile} from "music-metadata";
import {LibraryService} from "../src/main/services/library.ts";
import {LibraryRepository} from "../src/main/repositories/library.ts";

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
    await copyFile(join(music, "a.flac"), join(music, "b.flac"));
    const entered = deferred();
    const gate = deferred();
    const file = join(root, "library.sqlite");
    const library = new LibraryService(new LibraryRepository(file), join(root, "covers"), async (path) => {
        entered.resolve();
        await gate.promise;
        return parseFile(path);
    });

    try {
        const importing = library.scan(music);
        await entered.promise;
        const closing = library.close();
        await assert.rejects(library.scan(music), /shutting down/);
        await assert.rejects(library.index(join(music, "b.flac")), /shutting down/);
        gate.resolve();
        await importing;
        await closing;
        const reopened = new LibraryRepository(file);
        assert.equal(reopened.snapshot().tracks.length, 1);
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
