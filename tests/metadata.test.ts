import {test} from "node:test";
import assert from "node:assert/strict";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {parseFile} from "music-metadata";
import {readTags} from "../src/main/services/metadata.ts";
import {LibraryService} from "../src/main/services/library.ts";
import {LibraryRepository} from "../src/main/repositories/library.ts";
import {groupAlbums} from "../src/renderer/src/lib/music.ts";

const run = promisify(execFile);

void test("legacy ID3 slash names and album artists are repaired in the index without changing files", async () => {
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
        await library.refreshLegacyMetadata();
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
