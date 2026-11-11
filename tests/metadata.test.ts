import {test} from "node:test";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {promisify} from "node:util";
import assert from "node:assert/strict";
import {parseFile} from "music-metadata";
import {execFile} from "node:child_process";
import {readTags} from "../src/main/services/metadata.ts";
import {groupAlbums} from "../src/renderer/src/lib/music.ts";
import {LibraryService} from "../src/main/services/library.ts";
import {LibraryRepository} from "../src/main/repositories/library.ts";
import {mkdtemp, readFile, writeFile, stat, rm} from "node:fs/promises";

const run = promisify(execFile);

void test("ID3 slash names and album artists are indexed without changing files", async () => {
    const root = await mkdtemp(join(tmpdir(), "btunes-metadata-"));
    const repo = new LibraryRepository(":memory:");
    const library = new LibraryService(repo, join(root, "covers"));

    try {
        const path = join(root, "legacy.mp3");
        await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "anullsrc=r=8000:cl=mono", "-t", "0.2", "-id3v2_version", "3", "-metadata", "artist=AC/DC", "-metadata", "album_artist=AC/DC", "-metadata", "album=Shared album", path]);
        const original = await readFile(path);
        const metadata = await parseFile(path);
        assert.equal(metadata.common.artist, "AC");
        assert.equal(readTags(metadata).artist, "AC/DC");
        repo.upsert({ path, title: "Legacy", artist: "AC", album: "Shared album", genre: "Rock", year: 0, duration: 0.2, size: original.length, cover: null });
        const id = repo.snapshot().tracks[0].id;
        repo.played(id);
        const playlist = repo.create("Keep me");
        repo.add(playlist, id);
        await library.index(path);
        const track = repo.get(id)!;
        assert.equal(track.artist, "AC/DC");
        assert.equal(track.albumArtist, "AC/DC");
        assert.equal(track.plays, 1);
        assert.deepEqual(repo.playlist(playlist), [id]);
        assert.deepEqual(await readFile(path), original);
        const groups = groupAlbums([track, { ...track, id: 2, artist: "Guest singer" }]);
        assert.equal(groups.length, 1);
        assert.equal(groupAlbums([track, { ...track, id: 2, albumArtist: "Different artist" }]).length, 2);
    }
    finally {
        await library.close();
        await rm(root, { recursive: true, force: true });
    }
});

void test("zero MP3 header durations are repaired during reconciliation without changing audio", async () => {
    const root = await mkdtemp(join(tmpdir(), "btunes-duration-"));
    const repo = new LibraryRepository(":memory:");
    let reads = 0;
    const library = new LibraryService(repo, join(root, "covers"), async (path, options) => {
        reads++;
        return parseFile(path, options);
    });

    try {
        const path = join(root, "zero-header.mp3");
        await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", "2", path]);
        const original = await readFile(path);
        const header = original.indexOf("Info");
        assert.ok(header > 0, "Fixture must contain an MP3 frame-count header");
        original.write("Xing", header);
        original.writeUInt32BE(0, header + 8);
        await writeFile(path, original);
        assert.equal((await parseFile(path)).format.duration, 0);
        const file = await stat(path);
        repo.folder(root);
        repo.upsert({
            path, title: "Zero header", artist: "Fixture", albumArtist: "Fixture", album: "Test",
            genre: "Rock", year: 0, duration: 0, size: file.size, modifiedAt: file.mtimeMs, cover: null,
        });
        const id = repo.snapshot().tracks[0].id;
        const result = await library.reconcile();
        assert.deepEqual(result.errors, []);
        assert.equal(reads, 2, "A missing duration should trigger a full frame scan");
        assert.ok(repo.get(id)!.duration > 1.9 && repo.get(id)!.duration < 2.2);
        assert.deepEqual(await readFile(path), original);
        await library.reconcile();
        assert.equal(reads, 2, "Repaired files should be skipped on subsequent refreshes");
    }
    finally {
        await library.close();
        await rm(root, { recursive: true, force: true });
    }
});
