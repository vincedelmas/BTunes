import type {Track} from "./types/library.ts";
import {compareTracks} from "./track-sorting.ts";
import type {TrackSort} from "./types/track-sorting.ts";


export const smartMixes = [
    { id: "mix:recently-added", name: "Recently added", description: "The latest 100 songs added to your library.", sort: { field: "id", descending: true } },
    { id: "mix:most-played", name: "Most played", description: "Your 100 most-played songs.", sort: { field: "plays", descending: true } },
    { id: "mix:never-played", name: "Never played", description: "Songs waiting for their first listen.", sort: { field: "title", descending: false } },
    { id: "history", name: "Recently played", sort: { field: "lastPlayed", descending: true } },
] satisfies { id: string; name: string; description?: string; sort: TrackSort }[];


export function selectSmartMix(view: string, tracks: Track[]) {
    const mix = smartMixes.find((item) => item.id === view);
    if (!mix) return tracks;

    const matching = tracks.filter((track) => {
        if (view === "mix:most-played") return track.plays > 0;
        if (view === "mix:never-played") return track.plays === 0;
        if (view === "history") return track.lastPlayed > 0;
        return true;
    }).sort((first, second) => compareTracks(first, second, mix.sort));

    if (view === "mix:recently-added" || view === "mix:most-played") return matching.slice(0, 100);
    return matching;
}
