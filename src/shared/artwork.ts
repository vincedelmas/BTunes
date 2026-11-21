import type {TagPatch} from "./types/tags";


export const coverSearchQuery = (fallbackTitle: string, values: Pick<TagPatch, "title" | "album" | "artist" | "albumArtist">) => {
    const title = values.title || fallbackTitle;
    const artist = values.albumArtist || values.artist;
    const album = values.album === "Unknown album" ? "" : values.album;

    const terms = [album || title, artist];

    return [...new Set(terms.filter((value) => value && value !== "Unknown artist"))].join(" ");
};
