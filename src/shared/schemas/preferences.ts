import {z} from "zod";
import type {TrackSort} from "../types/track-sorting";

export const itemOrderSchema = z.array(z.string()).max(10000);
export const trackSortSchema = z.strictObject({
    field: z.enum(["id", "title", "artist", "albumArtist", "album", "genre", "duration", "year", "plays", "lastPlayed"]),
    descending: z.boolean(),
}) satisfies z.ZodType<TrackSort>;

export const volumeSchema = z.number().min(0).max(1);

export const appearanceSchema = z.strictObject({
    visualizer: z.enum(["spectrum", "waveform", "orbit", "off"]),
    sidebarArtwork: z.boolean(),
});

export const pinnedPlaylistsSchema = z.array(z.string()).max(3);
