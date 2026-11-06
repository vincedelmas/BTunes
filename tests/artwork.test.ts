import {test} from "node:test";
import assert from "node:assert/strict";
import {ArtworkService} from "../src/main/services/artwork.ts";

function archiveRequest(imageUrl: string, imageResponse: () => Response) {
    return (async (input) => {
        const url = (input instanceof Request ? input.url : input.toString());
        if (url.startsWith("https://musicbrainz.org/")) {
            return Response.json({ "release-groups": [{ id: "14e0ef40-585a-472b-a61c-13b62d11a226", title: "Brol", "artist-credit": [{ name: "Angèle" }] }] });
        }
        if (url.startsWith("https://coverartarchive.org/release-group/")) {
            return Response.json({ images: [{ front: true, image: imageUrl }] });
        }
        if (url === imageUrl) return imageResponse();
        throw new Error("Unexpected request: " + url);
    }) satisfies typeof fetch;
}

void test("cover search returns opaque local URLs and rejects oversized or expired selections", async () => {
    const service = new ArtworkService(archiveRequest("https://archive.org/cover.jpg", () => new Response("", { headers: { "Content-Length": String(11 * 1024 * 1024) } })));
    const candidates = await service.search("Angèle Brol");
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].album, "Brol");
    assert.equal(candidates[0].artist, "Angèle");
    assert.equal(candidates[0].thumbnail, "btunes://artwork/" + candidates[0].id);
    await assert.rejects(service.get(candidates[0].id), /too large/);
    await assert.rejects(service.get("unknown"), /expired/);
});

void test("cover downloads reject redirects outside the artwork providers", async () => {
    const service = new ArtworkService(archiveRequest("https://archive.org/cover.jpg", () => new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/private" }
    })));
    const [candidate] = await service.search("Album");
    await assert.rejects(service.get(candidate.id), /Unsupported cover image source/);
});

void test("an unavailable archive falls back to deduplicated iTunes artwork", async () => {
    const service = new ArtworkService((async (input) => {
        if ((input instanceof Request ? input.url : input.toString()).startsWith("https://musicbrainz.org/")) return new Response(null, { status: 503 });
        const result = { collectionName: "Album", artistName: "Artist", artworkUrl100: "https://is1-ssl.mzstatic.com/image/100x100bb.jpg" };
        return Response.json({ results: [result, result] });
    }) satisfies typeof fetch);
    const results = await service.search("Album Artist");
    assert.equal(results.length, 1);
    assert.equal(results[0].album, "Album");
});
