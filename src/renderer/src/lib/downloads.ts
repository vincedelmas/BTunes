import type {DownloadItem} from "../../../shared/types/downloads";

export const downloadStatusLabels: Record<DownloadItem["status"], string> = {
    available: "Available",
    invalid: "Check bookmark name",
    queued: "Queued",
    downloading: "Downloading",
    enriching: "Finding tags & cover",
    review: "Ready to review",
    publishing: "Saving",
    done: "In your library",
    error: "Failed",
    cancelled: "Cancelled",
};

export function canDownload(item: DownloadItem) {
    return item.status === "available" || item.status === "error" || item.status === "cancelled";
}
