import assert from "node:assert/strict";
import {test} from "node:test";
import {rpcSchemas} from "../src/shared/schemas/rpc.ts";

void test("RPC schemas validate identifiers, playlist mutations, and batch limits", () => {
    assert.equal(rpcSchemas["track.played"].safeParse({ id: -1 }).success, false);
    assert.equal(rpcSchemas["playlist.add"].safeParse({ playlistId: 1, trackIds: [] }).success, false);
    assert.equal(rpcSchemas["playlist.add"].safeParse({ playlistId: 1, trackId: 2, trackIds: [3] }).success, false);
    assert.deepEqual(rpcSchemas["playlist.add"].parse({ playlistId: 1, trackId: 2 }), { playlistId: 1, trackId: 2 });
    assert.deepEqual(rpcSchemas["playlist.remove"].parse({ playlistId: 1, trackIds: [2, 3] }), { playlistId: 1, trackIds: [2, 3] });
    assert.equal(rpcSchemas["tags.preview"].safeParse({ ids: Array.from({ length: 101 }, (_, index) => index + 1), patch: { title: "Title" } }).success, false);
});

void test("RPC schemas validate preview tokens, optional revisions, and trimmed playlist names", () => {
    assert.equal(rpcSchemas["tags.save"].safeParse({ token: "invalid-token" }).success, false);
    assert.deepEqual(rpcSchemas["tags.save"].parse({ token: "83a09396-a421-445b-8d8c-a9c18785eb3e" }), { token: "83a09396-a421-445b-8d8c-a9c18785eb3e" });
    assert.equal(rpcSchemas["library.get"].parse(undefined), undefined);
    assert.deepEqual(rpcSchemas["library.get"].parse({ revision: 0 }), { revision: 0 });
    assert.equal(rpcSchemas["library.get"].safeParse({ revision: -1 }).success, false);
    assert.deepEqual(rpcSchemas["playlist.create"].parse({ name: " Road trip " }), { name: "Road trip" });
    assert.equal(rpcSchemas["playlist.create"].safeParse({ name: " " }).success, false);
});

void test("playlist edit and delete schemas reject invalid identifiers and blank names", () => {
    assert.equal(rpcSchemas["playlist.update"].safeParse({ id: 0, name: "Valid" }).success, false);
    assert.equal(rpcSchemas["playlist.update"].safeParse({ id: 1, name: " " }).success, false);
    assert.equal(rpcSchemas["playlist.delete"].safeParse({ id: -1 }).success, false);
    assert.deepEqual(rpcSchemas["playlist.update"].parse({ id: 1, name: " Updated ", rule: " Jazz " }), { id: 1, name: "Updated", rule: "Jazz" });
});
