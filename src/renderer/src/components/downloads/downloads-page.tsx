import {useState} from "react";
import {ArrowDownToLine, Bookmark, RefreshCw, Settings, Square, X} from "lucide-react";
import {useDownloads} from "@/hooks/use-downloads";
import {useListSelection} from "@/hooks/use-list-selection";
import {VirtualGrid} from "@/components/virtual-grid";
import {Button} from "@/components/ui/button";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {EmptyState} from "@/components/empty-state";
import {FilterSelect} from "@/components/filter-select";
import {DownloadReview} from "@/components/downloads/download-review";
import {canDownload} from "@/lib/downloads";
import {DownloadRow} from "@/components/downloads/download-row";

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
        if (filter === "available") return canDownload(item);
        if (filter === "review") return item.status === "review";
        if (filter === "done") return item.status === "done";
        return true;
    });
    const selection = useListSelection(items.map((item) => item.id), selected, setSelected);
    const visibleSelection = new Set(items.filter((item) => selected.includes(item.id)).map((item) => item.id));
    const available = items.filter((item) => canDownload(item) && (!visibleSelection.size || visibleSelection.has(item.id)));
    const review = snapshot?.items.find((item) => item.id === reviewing);
    const total = snapshot?.items.length ?? 0;
    const reviewCount = snapshot?.items.filter((item) => item.status === "review").length ?? 0;

    return (
        <div className="downloads-page flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex shrink-0 flex-wrap items-center gap-3">
                <p className="mr-auto text-xs text-muted-foreground">
                    {total.toLocaleString("en")} {total === 1 ? "bookmarked song" : "bookmarked songs"}
                    {reviewCount > 0 && <span className="ml-3 text-primary">{reviewCount} ready to review</span>}
                </p>
                {visibleSelection.size > 0 && <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelected([])}
                >
                    <X data-icon="inline-start"/>
                    Clear selection ({visibleSelection.size})
                </Button>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
                <Button
                    disabled={!available.length || snapshot?.busy || snapshot?.scanning}
                    onClick={() => void downloads.start(available.map((item) => item.id))}
                >
                    <ArrowDownToLine data-icon="inline-start"/>
                    {visibleSelection.size ? "Download selected" : "Download available"}
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
                    className="ml-auto"
                    label="Download status"
                    value={filter}
                    onChange={setFilter}
                    placeholder="All statuses"
                    options={[{ value: "available", label: "Available / retry" }, { value: "review", label: "Ready to review" }, { value: "done", label: "In your library" }]}
                />
                <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Download settings"
                    onClick={onSettings}
                >
                    <Settings/>
                </Button>
            </div>
            {(downloads.error || snapshot?.error) && <Alert variant="destructive">
                <AlertDescription>{downloads.error || snapshot?.error}</AlertDescription>
            </Alert>}
            {!items.length ? (
                <EmptyState
                    icon={Bookmark}
                    title={snapshot?.scanning ? "Reading your bookmarks…" : "No songs to show"}
                    description={total ? "Try a different search or status filter." : "Choose your bookmarks file, folder, and naming pattern in Settings."}
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
                        <DownloadRow
                            item={item}
                            selected={visibleSelection.has(item.id)}
                            busy={Boolean(snapshot?.busy)}
                            onSelect={(ev) => selection.select(item.id, ev)}
                            onDownload={() => void downloads.start([item.id])}
                            onReview={() => setReviewing(item.id)}
                        />
                    )}
                />
            )}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                <p role="status">{snapshot?.tools.message || "Checking download tools…"}</p>
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={snapshot?.tools.checking}
                    onClick={() => void downloads.updateTools()}
                >
                    <RefreshCw data-icon="inline-start"/>
                    Check tools
                </Button>
            </div>
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
