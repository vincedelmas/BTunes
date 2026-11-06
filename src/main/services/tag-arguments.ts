import type {TagPatch} from "../../shared/types/tags.ts";

const names: Record<string, string> = { year: "date", albumArtist: "album_artist" };

export function tagArguments(patch: TagPatch) {
    return Object.entries(patch).flatMap(([key, value]) => [
        "-metadata", (names[key] ?? key) + "=" + (value === 0 ? "" : String(value)),
    ]);
}
