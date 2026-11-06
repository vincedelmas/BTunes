import type {Track} from "./contracts";

export type TrackSortField = "title" | "artist" | "album" | "genre" | "duration" | "year" | "plays" | "lastPlayed";
export type TrackSort = { field: TrackSortField; descending: boolean };

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const missingText: Partial<Record<TrackSortField, string>> = {
    artist: "unknown artist",
    album: "unknown album",
    genre: "uncategorized",
};

export function compareTracks(first: Track, second: Track, sort: TrackSort) {
    const firstValue = first[sort.field];
    const secondValue = second[sort.field];
    const firstMissing = isMissing(firstValue, sort.field);
    const secondMissing = isMissing(secondValue, sort.field);

    // Missing metadata stays grouped first in either direction.
    if (firstMissing !== secondMissing) return firstMissing ? -1 : 1;

    const comparison = typeof firstValue === "number" && typeof secondValue === "number"
        ? firstValue - secondValue
        : collator.compare(String(firstValue), String(secondValue));

    return (sort.descending ? -comparison : comparison) || first.id - second.id;
}

function isMissing(value: string | number, field: TrackSortField) {
    if (typeof value === "number") {
        return !Number.isFinite(value) || (field !== "plays" && value === 0);
    }

    return !value.trim() || value.trim().toLowerCase() === missingText[field];
}
