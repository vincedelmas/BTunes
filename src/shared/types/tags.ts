import type {z} from "zod";
import type {tagPatchSchema} from "../schemas/tags.ts";

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
