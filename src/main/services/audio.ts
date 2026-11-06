import {createReadStream} from "node:fs";
import {stat} from "node:fs/promises";
import {extname} from "node:path";
import {Readable} from "node:stream";

const audioTypes: Record<string, string> = {
    ".mp3": "audio/mpeg",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
    ".opus": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".wav": "audio/wav",
    ".aiff": "audio/aiff",
};

export async function serveAudio(path: string, request: Request): Promise<Response> {
    const file = await stat(path);
    const headers = new Headers({
        "Accept-Ranges": "bytes",
        "Content-Type": audioTypes[extname(path).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "no-store",
    });

    if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    let start = 0;
    let end = file.size - 1;
    const range = request.headers.get("Range");

    if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        const first = match?.[1];
        const last = match?.[2];

        if (!match || (!first && !last)) {
            headers.set("Content-Range", "bytes */" + file.size);
            return new Response(null, { status: 416, headers });
        }

        if (!first) {
            start = Math.max(0, file.size - Number(last));
        }
        else {
            start = Number(first);
            end = last ? Math.min(Number(last), end) : end;
        }

        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= file.size) {
            headers.set("Content-Range", "bytes */" + file.size);
            return new Response(null, { status: 416, headers });
        }

        headers.set("Content-Range", "bytes " + start + "-" + end + "/" + file.size);
    }

    headers.set("Content-Length", String(Math.max(0, end - start + 1)));

    if (request.method === "HEAD" || file.size === 0) {
        return new Response(null, { status: range ? 206 : 200, headers });
    }

    const stream = createReadStream(path, { start, end });
    const abort = () => stream.destroy();
    request.signal.addEventListener("abort", abort, { once: true });
    stream.once("close", () => request.signal.removeEventListener("abort", abort));

    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
        status: range ? 206 : 200,
        headers,
    });
}
