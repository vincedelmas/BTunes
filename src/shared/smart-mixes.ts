import type {Track} from "./types/library.ts";
import {compareTracks} from "./track-sorting.ts";
import type {TrackSort} from "./types/track-sorting.ts";


export const smartMixes = [
    {
        name: "Recently added",
        id: "mix:recently-added",
        sort: { field: "id", descending: true },
    },
    {
        id: "mix:most-played",
        name: "Most played",
        sort: { field: "plays", descending: true },
    },
    {
        name: "Never played",
        id: "mix:never-played",
        sort: { field: "title", descending: false },
    },
    {
        id: "history",
        name: "Recently played",
        sort: { field: "lastPlayed", descending: true },
    },
] satisfies { id: string; name: string; sort: TrackSort }[];


export function selectSmartMix(view: string, tracks: Track[]) {
    const mix = smartMixes.find((item) => item.id === view);
    if (!mix) return tracks;

    const matching = tracks.filter((track) => {
        if (view === "mix:most-played") return track.plays > 0;
        if (view === "mix:never-played") return track.plays === 0;
        if (view === "history") return track.lastPlayed > 0;
        return true;
    }).sort((first, second) => compareTracks(first, second, mix.sort));

    if (view === "mix:recently-added" || view === "mix:most-played") {
        return matching.slice(0, 100);
    }

    return matching;
}
