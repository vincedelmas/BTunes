import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {mkdtempSync, readFileSync, rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {LibraryRepository} from "../src/main/repositories/library.ts";

void test("Drizzle adopts a legacy database without losing its library or playlists", () => {
    const root = mkdtempSync(join(tmpdir(), "btunes-migration-"));
    const file = join(root, "library.sqlite");
    const legacy = new DatabaseSync(file);
    legacy.exec(
        readFileSync(
            new URL("./fixtures/legacy-library.sql", import.meta.url),
            "utf8",
        ),
    );
    legacy
        .prepare(
            `INSERT INTO tracks
    (id, path, title, artist, album, genre, year, duration, favorite, plays, lastPlayed, cover, size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
            42,
            "/music/legacy.flac",
            "Legacy song",
            "Artist",
            "Album",
            "Ambient",
            2020,
            60,
            1,
            7,
            123456,
            null,
            100,
        );
    legacy.prepare("INSERT INTO folders VALUES (?)").run("/music");
    legacy
        .prepare("INSERT INTO playlists VALUES (?, ?, ?)")
        .run(9, "My playlist", null);
    legacy.prepare("INSERT INTO playlist_tracks VALUES (?, ?)").run(9, 42);
    legacy.close();

    try {
        for (let attempt = 0; attempt < 2; attempt++) {
            const repository = new LibraryRepository(file);

            try {
                const snapshot = repository.snapshot();
                assert.equal(snapshot.tracks[0].id, 42);
                assert.equal(snapshot.tracks[0].favorite, 1);
                assert.equal(snapshot.tracks[0].plays, 7);
                assert.equal(snapshot.tracks[0].lastPlayed, 123456);
                assert.deepEqual(snapshot.folders, ["/music"]);
                assert.deepEqual(repository.playlist(9), [42]);
                assert.equal(snapshot.playlists[0].name, "My playlist");
                assert.equal(
                    repository.db
                        .prepare("SELECT count(*) AS count FROM __drizzle_migrations")
                        .get()?.count,
                    2,
                );
            }
            finally {
                repository.db.close();
            }
        }
    }
    finally {
        rmSync(root, { recursive: true, force: true });
    }
});
