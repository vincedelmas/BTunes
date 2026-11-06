import {z} from "zod";

export const tagFields = ["title", "artist", "album", "genre", "year"] as const;

export const tagLabels: Record<(typeof tagFields)[number], string> = {
    title: "Title",
    artist: "Artist",
    album: "Album",
    genre: "Genre",
    year: "Year",
};

const textTag = z.string().trim().min(1).max(500);

export const tagPatchSchema = z
    .object({
        title: textTag.optional(),
        artist: textTag.optional(),
        album: textTag.optional(),
        genre: textTag.optional(),
        year: z.number().int().min(0).max(9999).optional(),
    })
    .strict()
    .refine(
        (patch) => Object.keys(patch).length > 0,
        "Choose at least one field to edit.",
    );

export type TagPatch = z.infer<typeof tagPatchSchema>;

type TagChange = {
    field: keyof TagPatch;
    before: string | number;
    after: string | number;
};

export type TagPreview = {
    token: string;
    files: { id: number; title: string; path: string; changes: TagChange[] }[];
};

export type TagSaveResult = {
    updated: number;
    backupDirectory: string;
};
