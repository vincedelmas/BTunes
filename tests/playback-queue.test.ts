import {test} from "node:test";
import assert from "node:assert/strict";
import type {Track} from "../src/shared/types/library.ts";
import type {PlaybackQueue} from "../src/shared/types/playback-queue.ts";
import {clearUpcoming, removeQueuedTrack, reorderUpcoming, restoreUpcoming, shuffleUpcoming} from "../src/shared/playback-queue.ts";

const track: Track = {
    id: 1, path: "/song.mp3", title: "Song", artist: "Artist", albumArtist: "Artist", album: "Album",
    genre: "Ambient", year: 2024, duration: 180, plays: 0, lastPlayed: 0, favorite: 0, cover: null, size: 100,
};
const queue: PlaybackQueue = {
    entries: [1, 2, 3, 4, 5].map((key) => ({ key, track })),
    index: 1,
};

void test("editing a queue preserves the playing occurrence when songs appear more than once", () => {
    const reordered = reorderUpcoming(queue, [5, 3, 4]);
    assert.deepEqual(reordered.entries.map((entry) => entry.key), [1, 2, 5, 3, 4]);
    assert.equal(reordered.entries[reordered.index].key, 2);
    assert.equal(removeQueuedTrack(reordered, 2), reordered);
    const removed = removeQueuedTrack(removeQueuedTrack(reordered, 3), 1);
    assert.deepEqual(removed.entries.map((entry) => entry.key), [2, 5, 4]);
    assert.equal(removed.entries[removed.index].key, 2);
    assert.deepEqual(clearUpcoming(removed).entries.map((entry) => entry.key), [2]);
    assert.equal(reorderUpcoming(queue, [2, 3, 4]), queue);
    assert.equal(reorderUpcoming(queue, [3, 3, 4]), queue);
    assert.deepEqual(queue.entries.map((entry) => entry.key), [1, 2, 3, 4, 5]);
});

void test("shuffle changes only upcoming songs and restores their order without losing duplicates", () => {
    const shuffled = shuffleUpcoming(queue, () => 0);
    assert.deepEqual(shuffled.entries.slice(0, 2), queue.entries.slice(0, 2));
    assert.deepEqual(shuffled.entries.slice(2).map((entry) => entry.key).sort((first, second) => first - second), [3, 4, 5]);
    assert.notDeepEqual(shuffled.entries, queue.entries);
    assert.deepEqual(restoreUpcoming(shuffled, [3, 4, 5]), queue);
});
