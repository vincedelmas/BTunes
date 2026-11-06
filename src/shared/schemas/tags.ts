import {z} from "zod";

const textTag = z.string().trim().min(1).max(500);

export const tagPatchSchema = z
    .strictObject({
        title: textTag.optional(),
        artist: textTag.optional(),
        album: textTag.optional(),
        genre: textTag.optional(),
        year: z.number().int().min(0).max(9999).optional(),
    })
    .refine(
        (patch) => Object.keys(patch).length > 0,
        "Choose at least one field to edit.",
    );

