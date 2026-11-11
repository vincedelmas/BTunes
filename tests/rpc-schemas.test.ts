import {test} from "node:test";
import assert from "node:assert/strict";
import {rpcSchemas} from "../src/shared/schemas/rpc.ts";

void test("RPC schemas validate identifiers, playlist mutations, and batch limits", () => {
    assert.equal(rpcSchemas["track.played"].safeParse({ id: -1 }).success, false);
    assert.equal(rpcSchemas["playlist.add"].safeParse({ playlistId: 1, trackIds: [] }).success, false);
    assert.equal(rpcSchemas["playlist.add"].safeParse({ playlistId: 1, trackId: 2, trackIds: [3] }).success, false);
    assert.deepEqual(rpcSchemas["playlist.add"].parse({ playlistId: 1, trackId: 2 }), { playlistId: 1, trackId: 2 });
    assert.deepEqual(rpcSchemas["playlist.remove"].parse({ playlistId: 1, trackIds: [2, 3] }), { playlistId: 1, trackIds: [2, 3] });
    assert.equal(rpcSchemas["tags.preview"].safeParse({ ids: Array.from({ length: 101 }, (_, index) => index + 1), patch: { title: "Title" } }).success, false);
});

void test("artwork-only tag saves require an opaque artwork ID and search requires a query", () => {
    assert.equal(rpcSchemas["tags.preview"].safeParse({ ids: [1], patch: {} }).success, false);
    assert.equal(rpcSchemas["tags.preview"].safeParse({ ids: [1], patch: {}, artworkId: "f3a8fc6f-b13a-4210-9881-92734cfd9362" }).success, true);
    assert.equal(rpcSchemas["artwork.search"].safeParse({ query: "  " }).success, false);
});
