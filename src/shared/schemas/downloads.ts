import {z} from "zod";
import {tagPatchFieldsSchema} from "./tags.ts";
import {compileBookmarkPattern} from "../bookmarks.ts";


export const downloadRevisionSchema = z.object({ revision: z.number().int().nonnegative().optional() });

export const toolManifestSchema = z.record(z.string(), z.string().regex(/^[A-Za-z0-9._-]{1,100}$/));

export const downloadIdsSchema = z.object({ ids: z.array(z.string().regex(/^[\w-]{11}$/)).min(1).max(10000) });


export const downloaderSettingsSchema = z.object({
    fetchMetadata: z.boolean().default(true),
    folderId: z.string().max(200).default(""),
    destination: z.string().max(4096).default(""),
    bookmarksFile: z.string().max(4096).default(""),
    quality: z.enum(["128k", "192k", "256k", "320k"]).default("192k"),
    concurrency: z.number().int().min(1).max(10).default(3),
    namePattern: z.string().trim().min(1).max(500)
        .default("{artist} - {title}").refine((pattern) => {
            try {
                compileBookmarkPattern(pattern);
                return true;
            }
            catch {
                return false;
            }
        }, "Include {artist} and {title} once each, with a separator."),
});


export const publishDownloadSchema = z.object({
    patch: tagPatchFieldsSchema,
    artworkId: z.uuid().optional(),
    id: z.string().regex(/^[\w-]{11}$/),
});


export const releaseSchema = z.object({
    tag_name: z.string().regex(/^[A-Za-z0-9._-]{1,100}$/),
    assets: z.array(z.object({
        name: z.string(),
        browser_download_url: z.url(),
        size: z.number().int().nonnegative(),
        digest: z.string().nullable().optional(),
    })),
});


export const recordingResponseSchema = z.object({
    recordings: z.array(z.object({
        title: z.string(),
        video: z.boolean().optional(),
        score: z.coerce.number().optional(),
        disambiguation: z.string().optional(),
        "artist-credit": z.array(z.object({ name: z.string() })).optional(),
        releases: z.array(z.object({
            title: z.string(),
            date: z.string().optional(),
            status: z.string().optional(),
            "artist-credit": z.array(z.object({ name: z.string() })).optional(),
            "release-group": z.object({ "primary-type": z.string().optional(), "secondary-types": z.array(z.string()).optional() }).optional(),
        })).optional(),
    })).default([])
});


export const goDownloaderSettingsSchema = z.object({
    name_pattern: z.string().optional(), audio_quality: z.string().optional(),
    bookmark_path: z.string(), bookmark_position: z.number().int().nonnegative(),
    max_concurrent: z.number().optional(), fetch_metadata: z.boolean().optional(),
});


export const stagedDownloadSchema = z.object({
    stage: z.string(),
    item: z.object({
        tags: tagPatchFieldsSchema,
        id: z.string().regex(/^[\w-]{11}$/), name: z.string(), url: z.string(), artist: z.string(), title: z.string(), message: z.string(),
        artwork: z.object({
            id: z.uuid(),
            album: z.string(),
            artist: z.string(),
            thumbnail: z.string(),
        }).optional(),
    }),
});


export const storeMetadataResponseSchema = z.object({
    results: z.array(z.object({
        artistName: z.string(),
        trackName: z.string().optional(),
        releaseDate: z.string().optional(),
        collectionName: z.string().optional(),
        primaryGenreName: z.string().optional(),
    }))
});
