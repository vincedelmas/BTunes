import {z} from "zod";


export const fileDropSchema = z.object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    paths: z.array(z.string().min(1).max(4096)).min(1).max(1000),
});
