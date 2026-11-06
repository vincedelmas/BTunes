import {z} from "zod";
import {compileBookmarkPattern} from "../bookmarks.ts";
import {tagPatchFieldsSchema} from "./tags.ts";

export const downloaderSettingsSchema = z.object({
    bookmarksFile: z.string().max(4096).default(""),
    folderId: z.string().max(200).default(""),
    destination: z.string().max(4096).default(""),
    namePattern: z.string().trim().min(1).max(500).default("{artist} - {title}").refine((pattern) => {
        try {
            compileBookmarkPattern(pattern);
            return true;
        }
        catch {
            return false;
        }
    }, "Include {artist} and {title} once each, with a separator."),
    quality: z.enum(["128k", "192k", "256k", "320k"]).default("192k"),
    concurrency: z.number().int().min(1).max(10).default(3),
    fetchMetadata: z.boolean().default(true),
});
export const downloadIdsSchema = z.object({ ids: z.array(z.string().regex(/^[\w-]{11}$/)).min(1).max(10000) });
export const publishDownloadSchema = z.object({
    id: z.string().regex(/^[\w-]{11}$/),
    patch: tagPatchFieldsSchema,
    artworkId: z.uuid().optional(),
});
export const downloadRevisionSchema = z.object({ revision: z.number().int().nonnegative().optional() });
export const releaseSchema = z.object({
    tag_name: z.string().regex(/^[A-Za-z0-9._-]{1,100}$/),
    assets: z.array(z.object({ name: z.string(), browser_download_url: z.url(), size: z.number().int().nonnegative(), digest: z.string().nullable().optional() })),
});
export const toolManifestSchema = z.record(z.string(), z.string().regex(/^[A-Za-z0-9._-]{1,100}$/));
export const recordingResponseSchema = z.object({
    recordings: z.array(z.object({
        title: z.string(), score: z.coerce.number().optional(),
        video: z.boolean().optional(), disambiguation: z.string().optional(),
        "artist-credit": z.array(z.object({ name: z.string() })).optional(),
        releases: z.array(z.object({
            title: z.string(), date: z.string().optional(), status: z.string().optional(),
            "artist-credit": z.array(z.object({ name: z.string() })).optional(),
            "release-group": z.object({ "primary-type": z.string().optional(), "secondary-types": z.array(z.string()).optional() }).optional(),
        })).optional(),
    })).default([])
});
export const goDownloaderSettingsSchema = z.object({
    bookmark_path: z.string(), bookmark_position: z.number().int().nonnegative(),
    name_pattern: z.string().optional(), audio_quality: z.string().optional(),
    max_concurrent: z.number().optional(), fetch_metadata: z.boolean().optional(),
});

export const stagedDownloadSchema = z.object({
    stage: z.string(),
    item: z.object({
        id: z.string().regex(/^[\w-]{11}$/), name: z.string(), url: z.string(), artist: z.string(), title: z.string(), message: z.string(),
        tags: tagPatchFieldsSchema,
        artwork: z.object({ id: z.uuid(), album: z.string(), artist: z.string(), thumbnail: z.string() }).optional(),
    }),
});

export const storeMetadataResponseSchema = z.object({
    results: z.array(z.object({
        trackName: z.string().optional(), artistName: z.string(), collectionName: z.string().optional(),
        primaryGenreName: z.string().optional(), releaseDate: z.string().optional(),
    }))
});
