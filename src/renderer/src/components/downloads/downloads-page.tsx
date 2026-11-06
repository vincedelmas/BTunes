import {useState} from "react";
import {ArrowDownToLine, Bookmark, Check, RefreshCw, Settings, Square} from "lucide-react";
import {useDownloads} from "@/hooks/use-downloads";
import {useListSelection} from "@/hooks/use-list-selection";
import {VirtualGrid} from "@/components/virtual-grid";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {EmptyState} from "@/components/empty-state";
import {FilterSelect} from "@/components/filter-select";
import {DownloadReview} from "@/components/downloads/download-review";
import {cn} from "@/lib/utils";
import type {DownloadItem} from "../../../../shared/types/downloads";

const labels: Record<DownloadItem["status"], string> = {
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

interface DownloadsPageProps {
    query: string;
    genres: string[];
    onSettings: () => void;
    onSaved: () => Promise<void>;
}


export function DownloadsPage({ query, genres, onSettings, onSaved }: DownloadsPageProps) {
    const downloads = useDownloads();
    const [filter, setFilter] = useState("");
    const [selected, setSelected] = useState<string[]>([]);
    const [reviewing, setReviewing] = useState<string>();
    const snapshot = downloads.snapshot;
    const items = (snapshot?.items ?? []).filter((item) => {
        if (query && ![item.title, item.artist, item.name].join(" ").toLowerCase().includes(query.toLowerCase())) return false;
        if (filter === "available") return ["available", "error", "cancelled"].includes(item.status);
        if (filter === "review") return item.status === "review";
        if (filter === "done") return item.status === "done";
        return true;
    });
    const selection = useListSelection(items.map((item) => item.id), selected, setSelected);
    const selectedIds = new Set(selected);
    const available = items.filter((item) => ["available", "error", "cancelled"].includes(item.status) && (!selected.length || selectedIds.has(item.id)));
    const review = snapshot?.items.find((item) => item.id === reviewing);

    return (
        <div className="downloads-page flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex shrink-0 flex-wrap items-center gap-3">
                <Button
                    disabled={!available.length || snapshot?.busy || snapshot?.scanning}
                    onClick={() => void downloads.start(available.map((item) => item.id))}
                >
                    <ArrowDownToLine data-icon="inline-start"/>
                    {selected.length ? "Download selected" : "Download available"}
                </Button>
                {snapshot?.busy && <Button
                    variant="outline"
                    onClick={() => void downloads.cancel()}
                >
                    <Square data-icon="inline-start"/>
                    Stop downloads
                </Button>}
                <Button
                    variant="ghost"
                    disabled={snapshot?.busy || snapshot?.scanning}
                    onClick={() => void downloads.refresh()}
                >
                    <RefreshCw data-icon="inline-start"/>
                    {snapshot?.scanning ? "Scanning…" : "Refresh bookmarks"}
                </Button>
                <FilterSelect
                    label="Download status"
                    value={filter}
                    onChange={setFilter}
                    placeholder="All statuses"
                    options={[{ value: "available", label: "Available / retry" }, { value: "review", label: "Ready to review" }, { value: "done", label: "In your library" }]}
                />
                <Button
                    className="ml-auto"
                    size="icon"
                    variant="ghost"
                    aria-label="Download settings"
                    onClick={onSettings}
                >
                    <Settings/>
                </Button>
            </div>
            <div
                className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
                role="status"
            >
                <span>{snapshot?.items.length ?? 0} bookmarked songs</span>
                <span>{snapshot?.tools.message || "Checking download tools…"}</span>
                <Button
                    size="sm"
                    variant="link"
                    disabled={snapshot?.tools.checking}
                    onClick={() => void downloads.updateTools()}
                >Check tools</Button>
            </div>
            {(downloads.error || snapshot?.error) && <Alert variant="destructive">
                <AlertDescription>{downloads.error || snapshot?.error}</AlertDescription>
            </Alert>}
            {!items.length ? (
                <EmptyState
                    icon={Bookmark}
                    title={snapshot?.scanning ? "Reading your bookmarks…" : "No songs to show"}
                    description="Choose your bookmarks file, folder, and naming pattern in Settings."
                >
                    <Button
                        variant="outline"
                        onClick={onSettings}
                    >Download settings</Button>
                </EmptyState>
            ) : (
                <VirtualGrid
                    items={items}
                    label="Downloadable songs"
                    maxColumns={1}
                    itemHeight={76}
                    getKey={(item) => item.id}
                    renderItem={(item) => (
                        <div
                            role="option"
                            aria-selected={selectedIds.has(item.id)}
                            tabIndex={0}
                            onClick={(ev) => {
                                if (!(ev.target as HTMLElement).closest("button")) selection.select(item.id, ev);
                            }}
                            onKeyDown={(ev) => {
                                if (ev.key === " " && ev.target === ev.currentTarget) {
                                    ev.preventDefault();
                                    selection.select(item.id, ev);
                                }
                            }}
                            className={cn("download-row flex h-[72px] min-w-0 items-center gap-4 rounded-lg border border-transparent px-4 hover:bg-card", selectedIds.has(item.id) && "border-primary/40 bg-primary/5")}
                        >
                            <div className="min-w-0 flex-1">
                                <strong className="block truncate text-sm font-medium">{item.title}</strong>
                                <span className="mt-1 block truncate text-xs text-muted-foreground">{item.artist || item.name}</span>
                            </div>
                            <div className="min-w-0 max-w-[35%] text-right">
                                <Badge
                                    variant={item.status === "review" ? "default" : "secondary"}>{labels[item.status]}{item.status === "downloading" ? " · " + item.progress.toFixed(0) + "%" : ""}</Badge>
                                {item.message && <p
                                    className="mt-1 truncate text-[11px] text-muted-foreground"
                                    title={item.message}
                                >{item.message}</p>}
                            </div>
                            {item.status === "review" && <Button
                                size="sm"
                                onClick={() => setReviewing(item.id)}
                            >
                                <Check data-icon="inline-start"/>
                                Review & save
                            </Button>}
                            {["available", "error", "cancelled"].includes(item.status) && <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={"Download " + item.title}
                                disabled={snapshot?.busy}
                                onClick={() => void downloads.start([item.id])}
                            >
                                <ArrowDownToLine/>
                            </Button>}
                        </div>
                    )}
                />
            )}
            {review && (review.status === "review" || review.status === "publishing") && <DownloadReview
                key={review.id}
                item={review}
                genres={genres}
                onClose={() => setReviewing(undefined)}
                onSaved={onSaved}
            />}
        </div>
    );
}
