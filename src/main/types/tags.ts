import type {EmbeddedArtwork} from "./artwork";
import type {Track} from "../../shared/types/library";
import type {TagPatch} from "../../shared/types/tags";


export type SavePlan = {
    expiresAt: number;
    files: PlannedFile[];
};


export type PlannedFile = {
    track: Track;
    patch: TagPatch;
    fingerprint: string;
    artwork?: EmbeddedArtwork;
};
