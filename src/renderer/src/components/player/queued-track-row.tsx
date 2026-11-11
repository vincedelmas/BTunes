import {X} from "lucide-react";
import {formatTime} from "@/lib/music";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import type {useDragOrder} from "@/hooks/use-drag-order";
import {ReorderHandle} from "@/components/reorder-handle";
import type {QueuedTrack} from "../../../../shared/types/playback-queue";


interface QueuedTrackRowProps {
    entry: QueuedTrack;
    onPlay: () => void;
    onRemove: () => void;
    ordering: ReturnType<typeof useDragOrder>;
}


export function QueuedTrackRow({ entry, ordering, onPlay, onRemove }: QueuedTrackRowProps) {
    const key = String(entry.key);

    return (
        <div
            data-queue-key={entry.key}
            onDragOver={ordering.over}
            onDrop={(ev) => ordering.drop(ev, key)}
            className="queue-track group flex h-full min-w-0 items-center gap-2 rounded-lg px-1 hover:bg-secondary"
        >
            <ReorderHandle
                onDragEnd={ordering.end}
                onDragStart={(ev) => ordering.start(ev, key)}
                onKeyDown={(ev) => ordering.keyDown(ev, key)}
                label={"Move " + entry.track.title + " in queue"}
            />
            <button
                onClick={onPlay}
                aria-label={"Play queued song " + entry.track.title}
                className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left [&_.cover]:size-9"
            >
                <Cover track={entry.track}/>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                        {entry.track.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {entry.track.artist}
                    </span>
                </span>
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">
                {formatTime(entry.track.duration)}
            </span>
            <Button
                size="icon-xs"
                variant="plain"
                onClick={onRemove}
                title="Remove from queue"
                aria-label={"Remove " + entry.track.title + " from queue"}
                className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            >
                <X/>
            </Button>
        </div>
    );
}
