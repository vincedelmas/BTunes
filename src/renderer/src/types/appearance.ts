import type {z} from "zod";
import type {appearanceSchema} from "../../../shared/schemas/preferences";


export type Appearance = z.infer<typeof appearanceSchema>;
export type VisualizerStyle = Appearance["visualizer"];
