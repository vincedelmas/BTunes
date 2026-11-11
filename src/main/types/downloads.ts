import type {ToolStatus} from "../../shared/types/downloads.ts";

interface DownloadToolPaths {
    ytDlp: string;
    ffmpeg: string;
    ffprobe: string
}

export interface DownloadToolProvider {
    check: () => Promise<void>;
    snapshot: () => ToolStatus;
    close: () => Promise<void>;
    acquire: () => Promise<DownloadToolPaths>;
}

export type DownloadRunner = (command: string, args: string[], signal: AbortSignal, onLine?: (line: string) => void) => Promise<void>;
