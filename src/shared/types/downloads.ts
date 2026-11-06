import type {z} from "zod";
import type {downloaderSettingsSchema} from "../schemas/downloads.ts";
import type {TagPatch} from "./tags";
import type {ArtworkCandidate} from "./artwork";

export type DownloaderSettings = z.infer<typeof downloaderSettingsSchema>;

export interface BookmarkFolder {
    id: string;
    label: string
}

export interface DownloadItem {
    id: string;
    name: string;
    url: string;
    artist: string;
    title: string;
    status: "available" | "invalid" | "queued" | "downloading" | "enriching" | "review" | "publishing" | "done" | "error" | "cancelled";
    progress: number;
    message: string;
    tags: TagPatch;
    artwork?: ArtworkCandidate;
    path?: string;
}

export interface ToolStatus {
    checking: boolean;
    ready: boolean;
    message: string;
    versions: Record<string, string>;
}

export interface DownloadSnapshot {
    revision: number;
    scanning: boolean;
    busy: boolean;
    error: string;
    tools: ToolStatus;
    items: DownloadItem[];
}
