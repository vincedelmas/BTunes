import {downloaderSettingsSchema, downloadIdsSchema, downloadRevisionSchema, publishDownloadSchema} from "./downloads.ts";
import {deviceFolderSchema} from "./devices.ts";
import {fileDropSchema} from "./file-import.ts";
import {z} from "zod";
import {tagPatchFieldsSchema} from "./tags.ts";
import {artworkSearchSchema} from "./artwork.ts";

const trackId = z.number().int().positive();
const idSchema = z.object({ id: trackId });
const playlistMutationSchema = z.union([
    z.strictObject({ playlistId: trackId, trackId }),
    z.strictObject({ playlistId: trackId, trackIds: z.array(trackId).min(1).max(10000) }),
]);

const playlistDetails = {
    name: z.string().trim().min(1).max(100),
    rule: z.string().trim().min(1).max(100).optional(),
};

export const rpcSchemas = {
    "downloads.enter": z.undefined(),
    "downloads.get": downloadRevisionSchema,
    "downloads.start": downloadIdsSchema,
    "downloads.cancel": z.undefined(),
    "downloads.publish": publishDownloadSchema,
    "downloads.tools": z.undefined(),
    "downloads.settings.get": z.undefined(),
    "downloads.settings.save": downloaderSettingsSchema,
    "downloads.settings.import": z.undefined(),
    "downloads.bookmarks.choose": z.undefined(),
    "downloads.bookmarks.folders": z.object({ path: z.string().min(1).max(4096) }),
    "artwork.local": z.undefined(),
    "devices.list": z.undefined(),
    "devices.browse": deviceFolderSchema,
    "devices.mkdir": deviceFolderSchema,
    "devices.compare": deviceFolderSchema,
    "devices.status": z.undefined(),
    "devices.sync": z.undefined(),
    "devices.cancel": z.undefined(),
    "tags.preview": z.object({ patch: tagPatchFieldsSchema, ids: z.array(trackId).min(1).max(100), artworkId: z.uuid().optional() })
        .refine((input) => Object.keys(input.patch).length > 0 || Boolean(input.artworkId), "Choose a tag or cover to change."),
    "artwork.search": artworkSearchSchema,
    "tags.save": z.object({ token: z.uuid() }),
    "library.get": z.object({ revision: z.number().int().nonnegative() }).optional(),
    "library.refresh": z.undefined(),
    "library.import": z.undefined(),
    "library.drop": fileDropSchema,
    "track.reveal": idSchema,
    "track.favorite": idSchema,
    "track.played": idSchema,
    "playlist.remove": playlistMutationSchema,
    "playlist.add": playlistMutationSchema,
    "playlist.tracks": idSchema,
    "playlist.create": z.object(playlistDetails),
    "playlist.update": z.object({ id: trackId, ...playlistDetails }),
    "playlist.delete": idSchema,
};
