import assert from "node:assert/strict";
import {test} from "node:test";
import type {Track} from "../src/shared/types/library.ts";
import {compareTracks} from "../src/shared/track-sorting.ts";
import type {TrackSortField} from "../src/shared/types/track-sorting.ts";

const original: Track = {
    id: 1, title: "Song 2", artist: "Artist", albumArtist: "Artist", album: "Album", genre: "Ambient", year: 2020,
    duration: 120, plays: 0, lastPlayed: 0, favorite: 0, cover: null, size: 100, path: "/music/song.mp3",
};

function ordered(tracks: Track[], field: TrackSortField, descending = false) {
    return tracks.toSorted((first, second) => compareTracks(first, second, { field, descending })).map((track) => track.id);
}

void test("song sorting uses natural titles and numeric durations in both directions", () => {
    const tracks = [original, { ...original, id: 2, title: "Song 10", duration: 30 }];
    assert.deepEqual(ordered(tracks, "title"), [1, 2]);
    assert.deepEqual(ordered(tracks, "title", true), [2, 1]);
    assert.deepEqual(ordered(tracks, "duration"), [2, 1]);
    assert.deepEqual(ordered(tracks, "duration", true), [1, 2]);
});

void test("missing metadata precedes populated values in both sort directions", () => {
    for (const field of ["artist", "album", "genre", "year"] as const) {
        const missing = { artist: "Unknown artist", album: "Unknown album", genre: "Uncategorized", year: 0 }[field];
        const tracks = [original, { ...original, id: 2, [field]: missing }, { ...original, id: 3, [field]: field === "year" ? 2024 : "Zebra" }];
        assert.deepEqual(ordered(tracks, field), [2, 1, 3]);
        assert.deepEqual(ordered(tracks, field, true), [2, 3, 1]);
    }
});

void test("zero plays are a real count and sort last when descending", () => {
    const tracks = [original, { ...original, id: 2, plays: 20 }];
    assert.deepEqual(ordered(tracks, "plays"), [1, 2]);
    assert.deepEqual(ordered(tracks, "plays", true), [2, 1]);
});
