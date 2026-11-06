import {execFile} from "node:child_process";
import {createHash, randomUUID} from "node:crypto";
import type {ArtworkCandidate} from "../../shared/types/artwork.ts";
import type {ArtworkImage, CachedArtwork, CachedArtworkSearch, EmbeddedArtwork} from "../types/artwork.ts";
import {artworkSearchResponseSchema, releaseGroupSearchSchema} from "../../shared/schemas/artwork.ts";


const maxImageBytes = 10 * 1024 * 1024;
const maxSuggestions = 3;
const searchLifetime = 10 * 60 * 1000;

const searchWords = (value: string) => value.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);


const approvedImageUrl = (value: string) => {
    const url = new URL(value);
    if (url.protocol === "http:") {
        url.protocol = "https:";
    }

    const approved = url.hostname.endsWith(".mzstatic.com")
        || url.hostname === "coverartarchive.org"
        || url.hostname === "archive.org"
        || url.hostname.endsWith(".archive.org");

    if (url.protocol !== "https:" || !approved || url.username || url.password || url.port) {
        throw new Error("Unsupported cover image source.");
    }

    return url.href;
};


export const normalizeArtwork = (data: Buffer, ffmpeg = "ffmpeg"): Promise<Buffer> => new Promise((resolve, reject) => {
    const child = execFile(ffmpeg, [
            "-nostdin", "-v", "error", "-i", "pipe:0", "-frames:v", "1",
            "-vf", "scale=w='min(1500,iw)':h='min(1500,ih)':force_original_aspect_ratio=decrease",
            "-c:v", "mjpeg", "-q:v", "2", "-f", "image2pipe", "pipe:1",
        ],
        { timeout: 20000, encoding: "buffer", maxBuffer: maxImageBytes },
        (error, output) => {
            if (error || !output.length) {
                reject(new Error("The selected cover could not be decoded."));
            }
            else {
                resolve(output);
            }
        });

    child.stdin?.on("error", () => undefined);
    child.stdin?.end(data);
});


export class ArtworkService {
    private lastSearchAt = 0;
    private readonly request: typeof fetch;
    private readonly ffmpeg: () => string;
    private candidates = new Map<string, CachedArtwork>();
    private searches = new Map<string, CachedArtworkSearch>();

    constructor(request: typeof fetch = fetch, ffmpeg: () => string = () => "ffmpeg") {
        this.request = request;
        this.ffmpeg = ffmpeg;
    }

    async search(query: string): Promise<ArtworkCandidate[]> {
        const key = query.trim().replace(/\s+/g, " ").toLowerCase();
        const cached = this.searches.get(key);

        if (cached && cached.expiresAt > Date.now()) {
            const results = await cached.pending;
            if (results.every((result) => this.candidates.has(result.id))) return results;
        }

        const pending = this.findCandidates(query);
        const entry = { pending, expiresAt: Date.now() + searchLifetime };
        this.searches.set(key, entry);

        while (this.searches.size > 32) {
            this.searches.delete(this.searches.keys().next().value!);
        }

        try {
            const results = await pending;
            if (!results.length) this.searches.delete(key);
            return results;
        }
        catch (error) {
            if (this.searches.get(key) === entry) this.searches.delete(key);
            throw error;
        }
    }

    private async findCandidates(query: string): Promise<ArtworkCandidate[]> {
        const store = await this.searchStore(query).catch(() => []);
        if (store.length) return store;

        return this.searchArchive(query);
    }

    private async searchStore(query: string): Promise<ArtworkCandidate[]> {
        const url = new URL("https://itunes.apple.com/search");
        url.search = new URLSearchParams({ term: query, media: "music", entity: "album", limit: String(maxSuggestions) }).toString();
        const response = await this.request(url, { signal: AbortSignal.timeout(3000) });
        if (!response.ok) return [];

        const parsed = artworkSearchResponseSchema.parse(await response.json());
        const terms = searchWords(query);
        const seen = new Set<string>();
        const results: ArtworkCandidate[] = [];

        for (const result of parsed.results) {
            if (!result.artworkUrl100 || results.length >= maxSuggestions) continue;

            const words = new Set(searchWords([result.collectionName, result.artistName].join(" ")));
            if (!terms.every((term) => words.has(term))) continue;

            const original = approvedImageUrl(result.artworkUrl100);
            const imageUrl = original.replace(/100x100[^/]*\.(jpg|png)/, "600x600bb.$1");
            const previewUrl = original.replace(/100x100[^/]*\.(jpg|png)/, "300x300bb.$1");
            if (seen.has(imageUrl)) continue;

            seen.add(imageUrl);
            results.push(this.registerCandidate(imageUrl, previewUrl, result.collectionName ?? "Unknown album", result.artistName));
        }

        return results;
    }

    private async searchArchive(query: string): Promise<ArtworkCandidate[]> {
        const wait = Math.max(0, this.lastSearchAt + 1000 - Date.now());
        this.lastSearchAt = Date.now() + wait;
        if (wait) await new Promise((resolve) => setTimeout(resolve, wait));

        const url = new URL("https://musicbrainz.org/ws/2/release-group");
        url.search = new URLSearchParams({ query, fmt: "json", limit: String(maxSuggestions) }).toString();
        const response = await this.request(url, {
            signal: AbortSignal.timeout(8000),
            headers: { "User-Agent": "BTunes/0.1 (https://github.com/vincedelmas/BTunes)" },
        });
        if (!response.ok) throw new Error("Cover search is unavailable. Try again shortly.");

        const groups = releaseGroupSearchSchema.parse(await response.json())["release-groups"].slice(0, maxSuggestions);
        const results = await Promise.all(groups.map(async (group) => {
            try {
                const endpoint = "https://coverartarchive.org/release-group/" + group.id + "/front";
                const preview = await this.request(endpoint + "-250", {
                    method: "HEAD",
                    redirect: "manual",
                    signal: AbortSignal.timeout(3000),
                });
                const location = preview.headers.get("location");
                if (preview.status !== 307 || !location) return undefined;

                const artist = group["artist-credit"].map((credit) => credit.name).join(" & ");
                const previewUrl = new URL(location, endpoint).href;
                return this.registerCandidate(endpoint + "-500", previewUrl, group.title, artist);
            }
            catch {
                return undefined;
            }
        }));

        return results.filter((result) => result !== undefined);
    }

    private registerCandidate(imageUrl: string, previewUrl: string, album: string, artist: string): ArtworkCandidate {
        const id = randomUUID();
        this.candidates.set(id, { url: approvedImageUrl(imageUrl), previewUrl: approvedImageUrl(previewUrl), expiresAt: Date.now() + 30 * 60 * 1000 });

        while (this.candidates.size > 64) {
            this.candidates.delete(this.candidates.keys().next().value!);
        }

        return { id, album, artist, thumbnail: "btunes://artwork/" + id };
    }

    async local(data: Buffer): Promise<ArtworkCandidate> {
        if (data.length > maxImageBytes) throw new Error("Choose an image smaller than 10 MB.");
        const normalized = await normalizeArtwork(data, this.ffmpeg());
        const id = randomUUID();
        this.candidates.set(id, {
            url: "", previewUrl: "", preview: { data: normalized, contentType: "image/jpeg" },
            artwork: { data: normalized, hash: createHash("sha256").update(normalized).digest("hex") },
            expiresAt: Date.now() + 30 * 60 * 1000,
        });
        return { id, album: "Local cover", artist: "", thumbnail: "btunes://artwork/" + id };
    }

    private candidate(id: string) {
        const candidate = this.candidates.get(id);
        if (!candidate || candidate.expiresAt < Date.now()) {
            throw new Error("Cover search expired. Search again to select a cover.");
        }
        return candidate;
    }

    async preview(id: string): Promise<ArtworkImage> {
        const candidate = this.candidate(id);
        if (candidate.preview) return candidate.preview;

        if (!candidate.previewLoading) {
            candidate.previewLoading = this.downloadImage(candidate.previewUrl)
                .then((image) => {
                    candidate.preview = image;
                    return image;
                })
                .finally(() => {
                    candidate.previewLoading = undefined;
                });
        }

        return candidate.previewLoading;
    }

    async get(id: string): Promise<EmbeddedArtwork> {
        const candidate = this.candidate(id);

        if (candidate.artwork) return candidate.artwork;

        if (!candidate.loading) {
            candidate.loading = this.downloadImage(candidate.url)
                .then(async (image) => {
                    const data = await normalizeArtwork(image.data, this.ffmpeg());
                    const artwork = { data, hash: createHash("sha256").update(data).digest("hex") };
                    candidate.artwork = artwork;
                    return artwork;
                })
                .finally(() => {
                    candidate.loading = undefined;
                });
        }

        return candidate.loading;
    }

    private async downloadImage(imageUrl: string): Promise<ArtworkImage> {
        let url = imageUrl;
        let response: Response | undefined;

        for (let redirect = 0; redirect < 4; redirect++) {
            response = await this.request(approvedImageUrl(url), { redirect: "manual", signal: AbortSignal.timeout(15000) });
            if (![301, 302, 303, 307, 308].includes(response.status)) break;

            const location = response.headers.get("location");
            if (!location) throw new Error("Cover image is unavailable.");

            url = new URL(location, url).href;
        }

        if (!response?.ok || !response.body) {
            throw new Error("Could not download the cover image.");
        }

        if (Number(response.headers.get("content-length")) > maxImageBytes) {
            throw new Error("Cover image is too large.");
        }

        let size = 0;
        const chunks: Uint8Array[] = [];

        for await (const chunk of response.body) {
            size += chunk.length;

            if (size > maxImageBytes) {
                throw new Error("Cover image is too large.");
            }

            chunks.push(chunk);
        }

        const contentType = response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
        if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
            throw new Error("Unsupported cover image format.");
        }

        return { data: Buffer.concat(chunks), contentType };
    }
}
