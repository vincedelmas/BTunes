import assert from "node:assert/strict";
import {test} from "node:test";
import {readPreference, writePreference, normalizeOrder, moveItem} from "../src/renderer/src/lib/preferences.ts";
import {trackSortSchema, volumeSchema} from "../src/shared/schemas/preferences.ts";

void test("preferences persist valid sort values and reject corrupt or obsolete data", () => {
    const storage = new Map<string, string>();
    const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true, value: {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
        }
    });
    const fallback = { field: "title", descending: false } as const;

    try {
        writePreference("sort", { field: "genre", descending: true });
        assert.deepEqual(readPreference("sort", trackSortSchema, fallback), { field: "genre", descending: true });
        writePreference("volume", 0.23);
        assert.equal(readPreference("volume", volumeSchema, 0.7), 0.23);
        writePreference("volume", 0);
        assert.equal(readPreference("volume", volumeSchema, 0.7), 0);
        storage.set("volume", "1.5");
        assert.equal(readPreference("volume", volumeSchema, 0.7), 0.7);
        storage.set("sort", '{"field":"removed","descending":true}');
        assert.deepEqual(readPreference("sort", trackSortSchema, fallback), fallback);
        storage.set("sort", "broken JSON");
        assert.deepEqual(readPreference("sort", trackSortSchema, fallback), fallback);
        Object.defineProperty(globalThis, "localStorage", {
            configurable: true, get() {
                throw new Error("Unavailable");
            }
        });
        assert.doesNotThrow(() => writePreference("sort", fallback));
        assert.deepEqual(readPreference("sort", trackSortSchema, fallback), fallback);
    }
    finally {
        if (previous) Object.defineProperty(globalThis, "localStorage", previous);
        else Reflect.deleteProperty(globalThis, "localStorage");
    }
});

void test("saved order drops unknown IDs, preserves unique items, and appends new entries", () => {
    assert.deepEqual(normalizeOrder(["genre", "gone", "genre"], ["title", "artist", "genre"]), ["genre", "title", "artist"]);
    assert.deepEqual(moveItem(["title", "artist", "genre"], "genre", "artist"), ["title", "genre", "artist"]);
    assert.deepEqual(moveItem(["title", "artist", "genre"], "title", "genre"), ["artist", "genre", "title"]);
});
