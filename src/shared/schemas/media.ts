import {z} from "zod";
import {volumeSchema} from "./preferences.ts";


export const mediaStateSchema = z.object({
    volume: volumeSchema,
    active: z.boolean(),
    playing: z.boolean(),
    canGoNext: z.boolean(),
    canGoPrevious: z.boolean(),
    track: z.object({
        id: z.number().int().positive(),
        title: z.string(),
        album: z.string(),
        artist: z.string(),
    }).optional(),
});
