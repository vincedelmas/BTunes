import {setTimeout} from "node:timers/promises";
import type {TagPatch} from "../../shared/types/tags.ts";
import {recordingResponseSchema, storeMetadataResponseSchema} from "../../shared/schemas/downloads.ts";

export class DownloadMetadata {
    private readonly request: typeof fetch;
    private nextRequest = 0;
    private queue: Promise<unknown> = Promise.resolve();

    constructor(request: typeof fetch = fetch) {
        this.request = request;
    }

    lookup(artist: string, title: string, signal: AbortSignal): Promise<TagPatch> {
        const request = this.queue.catch(() => undefined).then(async () => {
            signal.throwIfAborted();
            await setTimeout(Math.max(0, this.nextRequest - Date.now()), undefined, { signal });
            this.nextRequest = Date.now() + 1100;
            const quote = (value: string) => '"' + value.replace(/[\\"]/g, "\\$&") + '"';
            const url = new URL("https://musicbrainz.org/ws/2/recording/");
            url.search = new URLSearchParams({
                query: "recording:" + quote(title) + " AND artist:" + quote(artist) + " AND NOT video:true AND NOT comment:live",
                fmt: "json",
                limit: "5"
            }).toString();
            const response = await this.request(url, {
                headers: { "User-Agent": "BTunes/0.1 (https://github.com/vincedelmas/BTunes)" },
                signal: AbortSignal.any([signal, AbortSignal.timeout(15000)])
            });
            if (!response.ok) throw new Error("MusicBrainz lookup failed (" + response.status + ").");
            const data = recordingResponseSchema.parse(await response.json());
            const recording = data.recordings.find((recording) =>
                (recording.score ?? 0) >= 90
                && recording.releases?.length
                && !recording.video
                && !/\b(live|demo|remix|karaoke|re-recording)\b/i.test(recording.disambiguation ?? "")
                && this.normalize(recording.title) === this.normalize(title)
                && recording["artist-credit"]?.some((credit) => this.normalize(credit.name) === this.normalize(artist))
            );
            if (!recording) throw new Error("No confident MusicBrainz match. Review the bookmark tags manually.");
            const releases = (recording.releases ?? []).filter((release) => {
                if (release.status && release.status !== "Official") return false;
                return !release["release-group"]?.["secondary-types"]?.some((kind) => ["Live", "Remix", "Demo", "DJ-mix"].includes(kind));
            });
            const score = (release: typeof releases[number]) => {
                const type = release["release-group"]?.["primary-type"];
                let points = 10;
                if (type === "Album") points = 100;
                else if (type === "Single") points = 60;
                if (release["artist-credit"]?.some((credit) => credit.name.toLowerCase() === artist.toLowerCase())) points += 40;
                if (release["release-group"]?.["secondary-types"]?.includes("Compilation")) points -= 100;
                return points;
            };
            const release = releases.sort((first, second) => score(second) - score(first) || (first.date ?? "9999").localeCompare(second.date ?? "9999"))[0];
            if (!release) throw new Error("No suitable album found for the MusicBrainz match.");

            return {
                title: recording.title,
                artist: recording["artist-credit"]?.map((credit) => credit.name).join(", ") || artist,
                albumArtist: release?.["artist-credit"]?.[0]?.name || recording["artist-credit"]?.[0]?.name || artist,
                album: release?.title || "Unknown album",
                year: Number(release?.date?.slice(0, 4)) || 0,
            };
        });
        const enriched = request.catch(async (error: unknown) => {
            if (signal.aborted) throw error;
            const url = new URL("https://itunes.apple.com/search");
            url.search = new URLSearchParams({ term: artist + " " + title, media: "music", entity: "song", limit: "5" }).toString();
            const response = await this.request(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) });
            if (!response.ok) throw new Error("Online metadata is unavailable. Review the bookmark tags manually.");
            const data = storeMetadataResponseSchema.parse(await response.json());
            const song = data.results.find((song) => song.trackName && this.normalize(song.trackName) === this.normalize(title) && this.normalize(song.artistName) === this.normalize(artist));
            if (!song) throw error;
            return {
                title: song.trackName!,
                artist: song.artistName,
                albumArtist: song.artistName,
                album: song.collectionName || "Unknown album",
                genre: song.primaryGenreName || "Uncategorized",
                year: Number(song.releaseDate?.slice(0, 4)) || 0,
            };
        });
        this.queue = enriched;
        return enriched;
    }

    private normalize(value: string) {
        return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    }
}
