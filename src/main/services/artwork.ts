import {createHash, randomUUID} from "node:crypto";
import {execFile} from "node:child_process";
import {artworkSearchResponseSchema, coverArchiveSchema, releaseGroupSearchSchema} from "../../shared/schemas/artwork.ts";
import type {ArtworkCandidate} from "../../shared/types/artwork.ts";
import type {CachedArtwork, EmbeddedArtwork} from "../types/artwork.ts";

const maxImageBytes = 10 * 1024 * 1024;

function approvedImageUrl(value: string) {
    const url = new URL(value);
    if (url.protocol === "http:") url.protocol = "https:";

    const approved = url.hostname.endsWith(".mzstatic.com") || url.hostname === "coverartarchive.org" || url.hostname === "archive.org" || url.hostname.endsWith(".archive.org");
    if (url.protocol !== "https:" || !approved || url.username || url.password || url.port) {
        throw new Error("Unsupported cover image source.");
    }

    return url.href;
}

export function normalizeArtwork(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const child = execFile("ffmpeg", [
            "-nostdin", "-v", "error", "-i", "pipe:0", "-frames:v", "1",
            "-vf", "scale=w='min(1500,iw)':h='min(1500,ih)':force_original_aspect_ratio=decrease",
            "-c:v", "mjpeg", "-q:v", "2", "-f", "image2pipe", "pipe:1",
        ], { encoding: "buffer", timeout: 20000, maxBuffer: maxImageBytes }, (error, output) => {
            if (error || !output.length) reject(new Error("The selected cover could not be decoded."));
            else resolve(output);
        });
        child.stdin?.on("error", () => undefined);
        child.stdin?.end(data);
    });
}

export class ArtworkService {
    private lastSearchAt = 0;
    private candidates = new Map<string, CachedArtwork>();

    private readonly request: typeof fetch;

    constructor(request: typeof fetch = fetch) {
        this.request = request;
    }

    async search(query: string): Promise<ArtworkCandidate[]> {
        const wait = Math.max(0, this.lastSearchAt + 1000 - Date.now());
        this.lastSearchAt = Date.now() + wait;
        if (wait) await new Promise((resolve) => setTimeout(resolve, wait));

        const musicBrainz = await this.searchArchive(query).catch(() => []);
        if (musicBrainz.length) return musicBrainz;

        const url = new URL("https://itunes.apple.com/search");
        url.search = new URLSearchParams({ term: query, media: "music", entity: "musicTrack", limit: "50" }).toString();
        const response = await this.request(url, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error("Cover search is unavailable. Try again shortly.");

        const parsed = artworkSearchResponseSchema.parse(await response.json());
        const seen = new Set<string>();
        const results: ArtworkCandidate[] = [];

        for (const result of parsed.results) {
            if (!result.artworkUrl100 || results.length >= 18) continue;
            const imageUrl = approvedImageUrl(result.artworkUrl100).replace(/100x100[^/]*\.(jpg|png)/, "600x600bb.$1");
            if (seen.has(imageUrl)) continue;

            seen.add(imageUrl);

            results.push(this.registerCandidate(imageUrl, result.collectionName ?? "Unknown album", result.artistName));
        }

        return results;
    }

    private async searchArchive(query: string): Promise<ArtworkCandidate[]> {
        const url = new URL("https://musicbrainz.org/ws/2/release-group");
        url.search = new URLSearchParams({ query, fmt: "json", limit: "8" }).toString();
        const response = await this.request(url, {
            signal: AbortSignal.timeout(15000),
            headers: { "User-Agent": "BTunes/0.1 (https://github.com/vincedelmas/BTunes)" },
        });
        if (!response.ok) return [];

        const groups = releaseGroupSearchSchema.parse(await response.json())["release-groups"];
        const results = await Promise.all(groups.map(async (group) => {
            try {
                const listing = await this.request("https://coverartarchive.org/release-group/" + group.id, { signal: AbortSignal.timeout(10000) });
                if (!listing.ok) return undefined;

                const front = coverArchiveSchema.parse(await listing.json()).images.find((image) => image.front);
                if (!front) return undefined;

                const imageUrl = front.thumbnails?.large ?? front.image;
                const artist = group["artist-credit"].map((credit) => credit.name).join(" & ");

                return this.registerCandidate(imageUrl, group.title, artist);
            }
            catch {
                return undefined;
            }
        }));
        return results.filter((result) => result !== undefined);
    }

    private registerCandidate(imageUrl: string, album: string, artist: string): ArtworkCandidate {
        const id = randomUUID();
        this.candidates.set(id, { url: approvedImageUrl(imageUrl), expiresAt: Date.now() + 30 * 60 * 1000 });

        while (this.candidates.size > 64) {
            this.candidates.delete(this.candidates.keys().next().value!);
        }

        return { id, album, artist, thumbnail: "btunes://artwork/" + id };
    }

    async get(id: string): Promise<EmbeddedArtwork> {
        const candidate = this.candidates.get(id);

        if (!candidate || candidate.expiresAt < Date.now()) {
            throw new Error("Cover search expired. Search again to select a cover.");
        }

        if (candidate.artwork) return candidate.artwork;

        if (!candidate.loading) {
            candidate.loading = this.download(candidate.url)
                .then((artwork) => {
                    candidate.artwork = artwork;
                    return artwork;
                })
                .finally(() => {
                    candidate.loading = undefined;
                });
        }

        return candidate.loading;
    }

    private async download(imageUrl: string): Promise<EmbeddedArtwork> {
        let url = imageUrl;
        let response: Response | undefined;

        for (let redirect = 0; redirect < 4; redirect++) {
            response = await this.request(approvedImageUrl(url), { redirect: "manual", signal: AbortSignal.timeout(15000) });
            if (![301, 302, 303, 307, 308].includes(response.status)) break;
            const location = response.headers.get("location");
            if (!location) throw new Error("Cover image is unavailable.");
            url = new URL(location, url).href;
        }

        if (!response?.ok || !response.body) throw new Error("Could not download the cover image.");
        if (Number(response.headers.get("content-length")) > maxImageBytes) throw new Error("Cover image is too large.");

        const chunks: Uint8Array[] = [];
        let size = 0;

        for await (const chunk of response.body) {
            size += chunk.length;
            if (size > maxImageBytes) {
                throw new Error("Cover image is too large.");
            }
            chunks.push(chunk);
        }

        const data = await normalizeArtwork(Buffer.concat(chunks));
        const artwork = { data, hash: createHash("sha256").update(data).digest("hex") };
        return artwork;
    }
}
