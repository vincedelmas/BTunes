import {test} from "node:test";
import assert from "node:assert/strict";
import {LibraryRepository} from "../src/main/repositories/library.ts";

const track = {
    path: "/music/a.flac",
    title: "Journey",
    artist: "Test",
    album: "Album",
    genre: "Ambient",
    year: 2024,
    duration: 120,
    cover: null,
    size: 100,
};
void test("indexing preserves favorites and play history on rescan", () => {
    const repo = new LibraryRepository(":memory:");
    try {
        repo.upsert(track);
        const id = repo.snapshot().tracks[0].id;
        repo.favorite(id);
        repo.played(id);
        repo.upsert({ ...track, title: "New title" });
        const rows = repo.snapshot().tracks;
        assert.equal(rows.length, 1);
        assert.equal(rows[0].title, "New title");
        assert.equal(rows[0].favorite, 1);
        assert.equal(rows[0].plays, 1);
    }
    finally {
        repo.db.close();
    }
});
void test("classic and automatic playlists, parameterized input, deletion cleanup", () => {
    const repo = new LibraryRepository(":memory:");
    try {
        repo.upsert(track);
        repo.upsert({ ...track, path: "/music/b.mp3", genre: "Rock" });
        const [a, b] = repo.snapshot().tracks;
        const classic = repo.create("Summer'); DROP TABLE tracks;--");
        repo.add(classic, b.id);
        repo.add(classic, b.id);
        assert.deepEqual(repo.playlist(classic), [b.id]);
        const smart = repo.create("Calm", "ambient");
        assert.deepEqual(repo.playlist(smart), [a.id]);
        repo.remove(b.path);
        assert.deepEqual(repo.playlist(classic), []);
        assert.equal(repo.snapshot().tracks.length, 1);
        assert.throws(() => repo.playlist(999));
    }
    finally {
        repo.db.close();
    }
});

void test("library revisions change on writes and classic playlist removal preserves the song", () => {
    const repo = new LibraryRepository(":memory:");

    try {
        const initial = repo.snapshot().revision;
        repo.upsert(track);
        const song = repo.snapshot().tracks[0];
        assert.ok(repo.snapshot().revision > initial);
        const unchanged = repo.snapshot().revision;
        repo.snapshot();
        assert.equal(repo.revision, unchanged);

        const playlistId = repo.create("Manual");
        repo.add(playlistId, song.id);
        repo.removeFromPlaylist(playlistId, song.id);
        assert.deepEqual(repo.playlist(playlistId), []);
        assert.ok(repo.get(song.id));
        const automaticId = repo.create("Automatic", "ambient");
        assert.throws(() => repo.removeFromPlaylist(automaticId, song.id), /classic playlists/);
        assert.deepEqual(repo.playlist(automaticId), [song.id]);
    }
    finally {
        repo.db.close();
    }
});

void test("bulk playlist edits are atomic and do not duplicate memberships", () => {
    const repo = new LibraryRepository(":memory:");

    try {
        repo.upsert(track);
        repo.upsert({ ...track, path: "/music/second.flac", title: "Second" });
        const ids = repo.snapshot().tracks.map((song) => song.id);
        const playlistId = repo.create("Bulk playlist");

        assert.throws(() => repo.add(playlistId, [ids[0], 999999]));
        assert.deepEqual(repo.playlist(playlistId), []);
        repo.add(playlistId, [...ids, ids[0]]);
        assert.deepEqual(repo.playlist(playlistId), ids);
        repo.removeFromPlaylist(playlistId, ids);
        assert.deepEqual(repo.playlist(playlistId), []);
        assert.equal(repo.snapshot().tracks.length, 2);
    }
    finally {
        repo.db.close();
    }
});

void test("playlist edits persist names and rules; deletion removes memberships while preserving songs", () => {
    const repo = new LibraryRepository(":memory:");

    try {
        repo.upsert(track);
        const song = repo.snapshot().tracks[0];
        const id = repo.create("Original");
        repo.add(id, song.id);
        const revision = repo.revision;

        repo.updatePlaylist(id, "Renamed");
        assert.equal(repo.snapshot().playlists[0].name, "Renamed");
        assert.deepEqual(repo.playlist(id), [song.id]);
        assert.ok(repo.revision > revision);

        repo.updatePlaylist(id, "Automatic", "Ambient");
        assert.equal(repo.snapshot().playlists[0].rule, "Ambient");
        repo.updatePlaylist(id, "Classic again");
        assert.equal(repo.snapshot().playlists[0].rule, null);
        assert.deepEqual(repo.playlist(id), [song.id]);

        repo.deletePlaylist(id);
        assert.deepEqual(repo.snapshot().playlists, []);
        assert.equal(repo.snapshot().tracks.length, 1);
        assert.equal(repo.db.prepare("SELECT count(*) AS count FROM playlist_tracks").get()?.count, 0);
        assert.throws(() => repo.updatePlaylist(id, "Missing"), /Playlist not found/);
        assert.throws(() => repo.deletePlaylist(id), /Playlist not found/);
    }
    finally {
        repo.db.close();
    }
});
