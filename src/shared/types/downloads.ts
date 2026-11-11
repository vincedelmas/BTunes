import type {z} from "zod";
import type {TagPatch} from "./tags";
import type {ArtworkCandidate} from "./artwork";
import type {downloaderSettingsSchema} from "../schemas/downloads.ts";


export type DownloaderSettings = z.infer<typeof downloaderSettingsSchema>;


export interface BookmarkFolder {
    id: string;
    label: string
}


export interface DownloadItem {
    id: string;
    url: string;
    name: string;
    title: string;
    path?: string;
    artist: string;
    tags: TagPatch;
    message: string;
    progress: number;
    artwork?: ArtworkCandidate;
    status: "available" | "invalid" | "queued" | "downloading" | "enriching" | "review" | "publishing" | "done" | "error" | "cancelled";
}


export interface ToolStatus {
    ready: boolean;
    message: string;
    checking: boolean;
    versions: Record<string, string>;
}


export interface DownloadSnapshot {
    busy: boolean;
    error: string;
    revision: number;
    scanning: boolean;
    tools: ToolStatus;
    items: DownloadItem[];
}
