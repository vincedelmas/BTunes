import type {TagPatch} from "./types/tags";

export const tagFields = ["title", "artist", "album", "genre", "year"] as const;

export const tagLabels: Record<keyof TagPatch, string> = {
    title: "Title",
    artist: "Artist",
    album: "Album",
    genre: "Genre",
    year: "Year",
};
