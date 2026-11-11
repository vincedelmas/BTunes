import {z} from "zod";


export const windowStateSchema = z.object({
    x: z.number().int(),
    y: z.number().int(),
    width: z.number().int().min(1000),
    height: z.number().int().min(700),
    maximized: z.boolean(),
    fullscreen: z.boolean(),
});
