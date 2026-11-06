import {z} from "zod";

export const persistedUpdateStateSchema = z.object({
    lastCheckedAt: z.number().nonnegative().optional(),
    dismissedVersion: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
});
