import {z} from "zod";


export const artworkSearchSchema = z.object({
    query: z.string().trim().min(1).max(300),
});


export const artworkSearchResponseSchema = z.object({
    results: z.array(z.object({
        artistName: z.string(),
        artworkUrl100: z.url().optional(),
        collectionName: z.string().optional(),
    }))
});


export const releaseGroupSearchSchema = z.object({
    "release-groups": z.array(z.object({
        id: z.uuid(),
        title: z.string(),
        "artist-credit": z.array(z.object({ name: z.string() })),
    }))
});
