import {test} from "node:test";
import {join} from "node:path";
import {tmpdir} from "node:os";
import assert from "node:assert/strict";
import {mkdtemp, writeFile, rm} from "node:fs/promises";
import {serveAudio} from "../src/main/services/audio.ts";

void test("audio streaming serves exact byte ranges, suffixes, HEAD, and invalid-range responses", async () => {
    const directory = await mkdtemp(join(tmpdir(), "btunes-audio-"));
    const path = join(directory, "song.mp3");
    const bytes = Buffer.from(Array.from({ length: 200 }, (_, index) => index));
    await writeFile(path, bytes);

    try {
        const range = await serveAudio(path, new Request("btunes://audio/1", { headers: { Range: "bytes=80-119" } }));
        assert.equal(range.status, 206);
        assert.equal(range.headers.get("Content-Range"), "bytes 80-119/200");
        assert.equal(range.headers.get("Content-Length"), "40");
        assert.equal(range.headers.get("Accept-Ranges"), "bytes");
        assert.equal(range.headers.get("Access-Control-Allow-Origin"), "*");
        assert.deepEqual(Buffer.from(await range.arrayBuffer()), bytes.subarray(80, 120));

        const suffix = await serveAudio(path, new Request("btunes://audio/1", { headers: { Range: "bytes=-20" } }));
        assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), bytes.subarray(180));
        const remainder = await serveAudio(path, new Request("btunes://audio/1", { headers: { Range: "bytes=190-" } }));
        assert.deepEqual(Buffer.from(await remainder.arrayBuffer()), bytes.subarray(190));

        const head = await serveAudio(path, new Request("btunes://audio/1", { method: "HEAD" }));
        assert.equal(head.headers.get("Content-Length"), "200");
        assert.equal(head.headers.get("Access-Control-Allow-Origin"), "*");
        assert.equal(await head.text(), "");

        for (const invalid of ["bytes=300-", "bytes=100-50", "bytes=-0", "bytes=0-1,3-4", "nonsense"]) {
            const response = await serveAudio(path, new Request("btunes://audio/1", { headers: { Range: invalid } }));
            assert.equal(response.status, 416);
            assert.equal(response.headers.get("Content-Range"), "bytes */200");
        }
    }
    finally {
        await rm(directory, { recursive: true, force: true });
    }
});
