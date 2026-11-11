import {X} from "lucide-react";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import {ReorderHandle} from "@/components/reorder-handle";
import {formatTime} from "@/lib/music";
import type {useDragOrder} from "@/hooks/use-drag-order";
import type {QueuedTrack} from "../../../../shared/types/playback-queue";


interface QueuedTrackRowProps {
    entry: QueuedTrack;
    ordering: ReturnType<typeof useDragOrder>;
    onPlay: () => void;
    onRemove: () => void;
}


export function QueuedTrackRow({ entry, ordering, onPlay, onRemove }: QueuedTrackRowProps) {
    const key = String(entry.key);

    return (
        <div
            className="queue-track group flex h-full min-w-0 items-center gap-2 rounded-lg px-1 hover:bg-secondary"
            data-queue-key={entry.key}
            onDragOver={ordering.over}
            onDrop={(ev) => ordering.drop(ev, key)}
        >
            <ReorderHandle
                label={"Move " + entry.track.title + " in queue"}
                onDragStart={(ev) => ordering.start(ev, key)}
                onDragEnd={ordering.end}
                onKeyDown={(ev) => ordering.keyDown(ev, key)}
            />
            <button
                className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left [&_.cover]:size-9"
                aria-label={"Play queued song " + entry.track.title}
                onClick={onPlay}
            >
                <Cover track={entry.track}/>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{entry.track.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{entry.track.artist}</span>
                </span>
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">{formatTime(entry.track.duration)}</span>
            <Button
                variant="plain"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                aria-label={"Remove " + entry.track.title + " from queue"}
                title="Remove from queue"
                onClick={onRemove}
            >
                <X/>
            </Button>
        </div>
    );
}
