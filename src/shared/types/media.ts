import type {z} from "zod";
import type {mediaStateSchema} from "../schemas/media.ts";


export type MediaState = z.infer<typeof mediaStateSchema>;

export type MediaCommand =
    | { action: "play" | "pause" | "stop" | "next" | "previous" | "toggle" }
    | { action: "volume"; volume: number }
    | { action: "stream-volume"; volume: number; native: boolean };
