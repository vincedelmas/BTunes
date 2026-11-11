import {z} from "zod";
import type {TrackSort} from "../types/track-sorting";


export const shuffleSchema = z.boolean();

export const repeatSchema = z.enum(["off", "all", "one"]);

export const volumeSchema = z.number().min(0).max(1);

export const itemOrderSchema = z.array(z.string()).max(10000);

export const pinnedPlaylistsSchema = z.array(z.string()).max(3);


export const trackSortSchema = z.strictObject({
    descending: z.boolean(),
    field: z.enum(["id", "title", "artist", "albumArtist", "album", "genre", "duration", "year", "plays", "lastPlayed"]),
}) satisfies z.ZodType<TrackSort>;


export const appearanceSchema = z.strictObject({
    sidebarArtwork: z.boolean(),
    visualizer: z.enum(["spectrum", "waveform", "orbit", "off"]),
});
