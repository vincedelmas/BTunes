import type {Track} from "../../shared/types/library";
import type {TagPatch} from "../../shared/types/tags";


export type SavePlan = {
    expiresAt: number;
    files: PlannedFile[];
};


import type {EmbeddedArtwork} from "./artwork";

export type PlannedFile = {
    artwork?: EmbeddedArtwork;
    track: Track;
    patch: TagPatch;
    fingerprint: string;
};
