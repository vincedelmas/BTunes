import {z} from "zod";

export const artworkSearchSchema = z.object({ query: z.string().trim().min(1).max(300) });
export const artworkSearchResponseSchema = z.object({
    results: z.array(z.object({
        collectionName: z.string().optional(),
        artistName: z.string(),
        artworkUrl100: z.url().optional(),
    }))
});

export const releaseGroupSearchSchema = z.object({
    "release-groups": z.array(z.object({
        id: z.uuid(),
        title: z.string(),
        "artist-credit": z.array(z.object({ name: z.string() })),
    }))
});

export const coverArchiveSchema = z.object({
    images: z.array(z.object({
        front: z.boolean(),
        image: z.url(),
        thumbnails: z.object({ large: z.url().optional() }).optional(),
    }))
});
