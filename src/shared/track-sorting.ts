import type {Track} from "./types/library";
import type {TrackSort, TrackSortField} from "./types/track-sorting";

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const missingText: Partial<Record<TrackSortField, string>> = {
    artist: "unknown artist",
    albumArtist: "unknown artist",
    album: "unknown album",
    genre: "uncategorized",
};

export function sortTracks(tracks: readonly Track[], { field, descending }: TrackSort) {
    const keys = tracks.map((track) => {
        const value = track[field];
        return { track, value, missing: isMissing(value, field) };
    });

    keys.sort((first, second) => {
        // Missing metadata stays grouped first in either direction.
        if (first.missing !== second.missing) return first.missing ? -1 : 1;

        const comparison = typeof first.value === "number" && typeof second.value === "number"
            ? first.value - second.value
            : collator.compare(String(first.value), String(second.value));

        return (descending ? -comparison : comparison) || first.track.id - second.track.id;
    });

    return keys.map(({ track }) => track);
}

function isMissing(value: string | number, field: TrackSortField) {
    if (typeof value === "number") {
        return !Number.isFinite(value) || (field !== "plays" && value === 0);
    }

    const trimmed = value.trim();
    return !trimmed || trimmed.toLowerCase() === missingText[field];
}
