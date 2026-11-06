import {coverSearchQuery} from "../src/renderer/src/lib/artwork.ts";
import {test} from "node:test";
import assert from "node:assert/strict";
import {ArtworkService} from "../src/main/services/artwork.ts";

function archiveRequest(imageUrl: string, imageResponse: () => Response) {
    return (async (input, options) => {
        const url = (input instanceof Request ? input.url : input.toString());
        if (url.startsWith("https://itunes.apple.com/")) return Response.json({ results: [] });
        if (url.startsWith("https://musicbrainz.org/")) {
            return Response.json({ "release-groups": [{ id: "14e0ef40-585a-472b-a61c-13b62d11a226", title: "Brol", "artist-credit": [{ name: "Angèle" }] }] });
        }
        if (url.startsWith("https://coverartarchive.org/release-group/")) {
            assert.ok(url.endsWith(options?.method === "HEAD" ? "/front-250" : "/front-500"));
            return new Response(null, { status: 307, headers: { location: imageUrl } });
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

void test("matching iTunes artwork returns at most three choices without archive lookups", async () => {
    let calls = 0;
    const service = new ArtworkService((async (input) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        calls++;
        assert.equal(url.hostname, "itunes.apple.com");
        assert.equal(url.searchParams.get("entity"), "album");
        assert.equal(url.searchParams.get("limit"), "3");
        const result = { collectionName: "Album", artistName: "Artist", artworkUrl100: "https://is1-ssl.mzstatic.com/image/100x100bb.jpg" };
        return Response.json({
            results: [result, result, ...[1, 2, 3, 4].map((index) => ({
                ...result,
                artworkUrl100: "https://is1-ssl.mzstatic.com/image/" + index + "/100x100bb.jpg"
            }))]
        });
    }) satisfies typeof fetch);

    const [first, concurrent] = await Promise.all([service.search("Album Artist"), service.search("Album Artist")]);
    assert.equal(first.length, 3);
    assert.deepEqual(first, concurrent);
    assert.deepEqual(await service.search("  ALBUM   ARTIST  "), first);
    assert.equal(calls, 1, "Repeated and concurrent searches should reuse the same lookup");
});

void test("unrelated store results fall back to three direct archive thumbnail checks", async () => {
    let archiveChecks = 0;
    const service = new ArtworkService((async (input, options) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.hostname === "itunes.apple.com") {
            return Response.json({ results: [{ collectionName: "Nonante-Cinq", artistName: "Angèle", artworkUrl100: "https://is1-ssl.mzstatic.com/image/100x100bb.jpg" }] });
        }
        if (url.hostname === "musicbrainz.org") {
            assert.equal(url.searchParams.get("limit"), "3");
            return Response.json({
                "release-groups": [1, 2, 3, 4, 5].map((index) => ({
                    id: "14e0ef40-585a-472b-a61c-13b62d11a22" + index,
                    title: "Brol",
                    "artist-credit": [{ name: "Angèle" }]
                }))
            });
        }
        archiveChecks++;
        assert.equal(options?.method, "HEAD");
        assert.equal(options?.redirect, "manual");
        assert.ok(url.pathname.endsWith("/front-250"));
        return new Response(null, { status: 307, headers: { location: "https://archive.org/cover.jpg" } });
    }) satisfies typeof fetch);

    const results = await service.search("Brol Angèle");
    assert.equal(results.length, 3);
    assert.equal(archiveChecks, 3);
    assert.ok(results.every((result) => result.album === "Brol"));
});

void test("thumbnail previews are cached separately from the larger embedded image", async () => {
    const downloaded: string[] = [];
    const preview = Buffer.from("image fixture bytes");
    const service = new ArtworkService((async (input) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.hostname === "itunes.apple.com") {
            return Response.json({ results: [{ collectionName: "Album", artistName: "Artist", artworkUrl100: "https://is1-ssl.mzstatic.com/image/100x100bb.jpg" }] });
        }
        downloaded.push(url.pathname);
        return new Response(preview, { headers: { "Content-Type": "image/jpeg" } });
    }) satisfies typeof fetch);

    const [candidate] = await service.search("Album Artist");
    const [first, second] = await Promise.all([service.preview(candidate.id), service.preview(candidate.id)]);
    assert.deepEqual(first.data, preview);
    assert.deepEqual(second, first);
    assert.deepEqual(await service.preview(candidate.id), first);
    assert.deepEqual(downloaded, ["/image/300x300bb.jpg"]);
    await assert.rejects(service.get(candidate.id), /could not be decoded/);
    assert.deepEqual(downloaded, ["/image/300x300bb.jpg", "/image/600x600bb.jpg"]);
});

void test("cover lookup uses current metadata and handles mixed artists without inventing a query", () => {
    assert.equal(coverSearchQuery("Song", { title: "Song", album: "Brol", artist: "Angèle ft. Roméo Elvis", albumArtist: "Angèle" }), "Brol Angèle");
    assert.equal(coverSearchQuery("Song", { title: "", album: "Big Willie Style", artist: "", albumArtist: "" }), "Big Willie Style");
    assert.equal(coverSearchQuery("Song", { title: "New title", album: "Unknown album", artist: "Artist", albumArtist: "" }), "New title Artist");
});
