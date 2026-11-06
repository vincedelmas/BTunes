import type {TagPatch} from "./types/tags";

export const tagFields = ["title", "artist", "albumArtist", "album", "genre", "year"] as const;

export const tagLabels: Record<keyof TagPatch, string> = {
    title: "Title",
    artist: "Artist",
    albumArtist: "Album artist",
    album: "Album",
    genre: "Genre",
    year: "Year",
};
