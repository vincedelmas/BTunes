import {z} from "zod";
import {mediaStateSchema} from "./media.ts";
import {tagPatchFieldsSchema} from "./tags.ts";
import {deviceFolderSchema} from "./devices.ts";
import {fileDropSchema} from "./file-import.ts";
import {artworkSearchSchema} from "./artwork.ts";
import {downloaderSettingsSchema, downloadIdsSchema, downloadRevisionSchema, publishDownloadSchema} from "./downloads.ts";


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
    "media.update": mediaStateSchema,
    "track.reveal": idSchema,
    "track.played": idSchema,
    "track.favorite": idSchema,
    "playlist.tracks": idSchema,
    "playlist.delete": idSchema,
    "updates.get": z.undefined(),
    "devices.list": z.undefined(),
    "devices.sync": z.undefined(),
    "updates.check": z.undefined(),
    "artwork.local": z.undefined(),
    "library.drop": fileDropSchema,
    "devices.status": z.undefined(),
    "devices.cancel": z.undefined(),
    "library.import": z.undefined(),
    "updates.install": z.undefined(),
    "updates.dismiss": z.undefined(),
    "downloads.enter": z.undefined(),
    "downloads.tools": z.undefined(),
    "library.refresh": z.undefined(),
    "updates.download": z.undefined(),
    "downloads.cancel": z.undefined(),
    "devices.mkdir": deviceFolderSchema,
    "devices.browse": deviceFolderSchema,
    "downloads.start": downloadIdsSchema,
    "devices.compare": deviceFolderSchema,
    "artwork.search": artworkSearchSchema,
    "playlist.add": playlistMutationSchema,
    "downloads.settings.get": z.undefined(),
    "downloads.get": downloadRevisionSchema,
    "playlist.remove": playlistMutationSchema,
    "downloads.publish": publishDownloadSchema,
    "tags.save": z.object({ token: z.uuid() }),
    "downloads.settings.import": z.undefined(),
    "downloads.bookmarks.choose": z.undefined(),
    "playlist.create": z.object(playlistDetails),
    "downloads.settings.save": downloaderSettingsSchema,
    "playlist.update": z.object({ id: trackId, ...playlistDetails }),
    "library.get": z.object({ revision: z.number().int().nonnegative() }).optional(),
    "downloads.bookmarks.folders": z.object({ path: z.string().min(1).max(4096) }),
    "tags.preview": z.object({
        patch: tagPatchFieldsSchema,
        artworkId: z.uuid().optional(),
        ids: z.array(trackId).min(1).max(100),
    }).refine((input) => Object.keys(input.patch).length > 0 || Boolean(input.artworkId), "Choose a tag or cover to change."),
};
