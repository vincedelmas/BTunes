import {z} from "zod";
import {tagPatchSchema} from "./tags.ts";

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
    "tags.preview": z.object({ patch: tagPatchSchema, ids: z.array(trackId).min(1).max(100) }),
    "tags.save": z.object({ token: z.uuid() }),
    "library.get": z.object({ revision: z.number().int().nonnegative() }).optional(),
    "library.import": z.undefined(),
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
