import {z} from "zod";


const textTag = z.string().trim().min(1).max(500);


export const tagPatchFieldsSchema = z
    .strictObject({
        title: textTag.optional(),
        genre: textTag.optional(),
        album: textTag.optional(),
        artist: textTag.optional(),
        albumArtist: z.string().trim().max(500).optional(),
        year: z.number().int().min(0).max(9999).optional(),
    });


export const tagPatchSchema = tagPatchFieldsSchema.refine(
    (patch) => Object.keys(patch).length > 0,
    "Choose at least one field to edit.",
);

