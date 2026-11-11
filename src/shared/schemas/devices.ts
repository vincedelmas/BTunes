import {z} from "zod";

const storageId = z.string().regex(/^\/modules\/kmtpd\/device\d+\/storage\d+$/);
const phonePath = z.string().max(4096).refine((value) => {
    return value.startsWith("/") && !value.includes("\0") && !value.split("/").some((part) => part === "." || part === "..");
}, "Choose a folder on the phone.");

export const deviceFolderSchema = z.object({ storageId, path: phonePath });
export const mtpPathsSchema = z.array(z.string().regex(/^\/modules\/kmtpd\/device\d+(?:\/storage\d+)?$/));
export const mtpFileSchema = z.tuple([
    // KDE's D-Bus tuple is positional: IDs, name, size, modified time, and MIME type.
    z.number().int().nonnegative(), z.number().int().nonnegative(), z.number().int().nonnegative(),
    z.string(), z.number().int().nonnegative(), z.number(), z.string(),
]);
export const mtpFilesSchema = z.tuple([z.array(mtpFileSchema), z.number().int()]);

export const mtpResponseSchema = z.object({ data: z.unknown() });
export const mtpCallResponseSchema = z.object({ data: z.array(z.unknown()) });
export const mtpNameSchema = z.string();
export const mtpBytesSchema = z.number().int().nonnegative();
