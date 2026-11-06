import {ArrowDownToLine, Check, LoaderCircle, TriangleAlert} from "lucide-react";
import type {DownloadItem} from "../../../../shared/types/downloads";
import type {SelectionModifiers} from "@/types/selection";
import {canDownload, downloadStatusLabels} from "@/lib/downloads";
import {cn} from "@/lib/utils";
import {Cover} from "@/components/cover";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";

interface DownloadRowProps {
    item: DownloadItem;
    selected: boolean;
    busy: boolean;
    onSelect: (ev: SelectionModifiers) => void;
    onDownload: () => void;
    onReview: () => void;
}


export function DownloadRow({ item, selected, busy, onSelect, onDownload, onReview }: DownloadRowProps) {
    const working = item.status === "downloading" || item.status === "enriching" || item.status === "publishing";
    const failed = item.status === "error" || item.status === "invalid";
    const needsAttention = item.status === "review" && Boolean(item.message) && item.message !== "Review tags and cover, then save to your library.";
    const label = needsAttention ? "Check tags & cover" : downloadStatusLabels[item.status];
    let variant: "success" | "warning" | "destructive" | "secondary" = "secondary";
    if (item.status === "review") variant = "success";
    if (needsAttention) variant = "warning";
    if (failed) variant = "destructive";

    let detail = "";
    if (needsAttention) detail = "Some online details are missing.";
    if (item.status === "error") detail = "Download failed. Try again.";
    if (item.status === "invalid") detail = "Check the bookmark naming pattern.";
    if (item.status === "cancelled") detail = "Stopped. You can try again.";

    return (
        <div
            role="option"
            aria-selected={selected}
            tabIndex={0}
            onClick={(ev) => {
                if (!(ev.target as HTMLElement).closest("button")) onSelect(ev);
            }}
            onKeyDown={(ev) => {
                if ((ev.key === " " || ev.key === "Enter") && ev.target === ev.currentTarget) {
                    ev.preventDefault();
                    onSelect(ev);
                }
            }}
            className={cn("download-row flex h-[72px] min-w-0 items-center gap-4 rounded-lg border border-transparent px-3 outline-none hover:bg-card focus-visible:border-primary", selected && "border-primary/30 bg-primary/5")}
        >
            <Cover source={item.artwork?.thumbnail}/>
            <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium">{item.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{item.artist || item.name}</p>
            </div>
            <div className="download-status min-w-0 max-w-[35%] text-right">
                <Badge variant={variant} className="max-w-full">
                    {working && <LoaderCircle className="animate-spin"/>}
                    {needsAttention && <TriangleAlert/>}
                    <span className="truncate">
                        {label}
                        {item.status === "downloading" && " · " + item.progress.toFixed(0) + "%"}
                    </span>
                </Badge>
                {detail && <p
                    className="mt-1 truncate text-xs text-muted-foreground"
                    title={item.message}
                >{detail}</p>}
            </div>
            <div className="flex min-w-36 shrink-0 justify-end">
                {item.status === "review" && <Button
                    size="sm"
                    variant="outline"
                    onClick={onReview}
                >
                    <Check data-icon="inline-start"/>
                    Review & save
                </Button>}
                {canDownload(item) && <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={"Download " + item.title}
                    disabled={busy}
                    onClick={onDownload}
                >
                    <ArrowDownToLine/>
                </Button>}
            </div>
        </div>
    );
}
