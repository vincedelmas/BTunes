import {z} from "zod";
import type {TrackSort} from "../types/track-sorting";

export const itemOrderSchema = z.array(z.string()).max(10000);
export const trackSortSchema = z.strictObject({
    field: z.enum(["title", "artist", "albumArtist", "album", "genre", "duration", "year", "plays", "lastPlayed"]),
    descending: z.boolean(),
}) satisfies z.ZodType<TrackSort>;

export const volumeSchema = z.number().min(0).max(1);
