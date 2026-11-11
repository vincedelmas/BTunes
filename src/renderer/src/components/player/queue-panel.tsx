import {useEffect} from "react";
import {Cover} from "@/components/cover";
import {formatDuration} from "@/lib/music";
import {Button} from "@/components/ui/button";
import type {PlayerState} from "@/types/player";
import {EmptyState} from "@/components/empty-state";
import {useDragOrder} from "@/hooks/use-drag-order";
import {VirtualGrid} from "@/components/virtual-grid";
import {ListMusic, Pause, Play, Shuffle, X} from "lucide-react";
import {QueuedTrackRow} from "@/components/player/queued-track-row";


interface QueuePanelProps {
    player: PlayerState;
    onClose: () => void;
}


export function QueuePanel({ player, onClose }: QueuePanelProps) {
    const current = player.queue[player.queueIndex];
    const upcoming = player.queue.slice(player.queueIndex + 1);
    const duration = upcoming.reduce((total, entry) => total + Math.max(0, entry.track.duration || 0), 0);
    const ordering = useDragOrder(upcoming.map((entry) => String(entry.key)), (keys) => player.reorderUpcoming(keys.map(Number)), "queue");

    useEffect(() => {
        const close = (ev: KeyboardEvent) => {
            if (ev.key !== "Escape" || document.querySelector('[role="dialog"], [role="menu"]')) return;
            onClose();
        };

        document.addEventListener("keydown", close);
        return () => document.removeEventListener("keydown", close);
    }, [onClose]);

    return (
        <aside
            aria-label="Playback queue"
            className="queue fixed bottom-[106px] right-2 top-2 z-20 flex w-[390px] flex-col gap-4 overflow-hidden rounded-xl border border-border bg-popover p-5 shadow-[-20px_0_70px_#0005]"
        >
            <header className="flex shrink-0 items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold">
                        Queue
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {upcoming.length}
                        {" "}
                        upcoming ·
                        {" "}
                        {formatDuration(duration)}
                    </p>
                </div>
                <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={onClose}
                    aria-label="Close queue"
                >
                    <X/>
                </Button>
            </header>
            {current && (
                <section
                    aria-label="Now playing in queue"
                    className="shrink-0 rounded-xl border border-primary/20 bg-primary/5 p-3"
                >
                    <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-primary">
                        Now playing
                    </p>
                    <div
                        aria-current="true"
                        data-queue-key={current.key}
                        className="queue-track flex min-w-0 items-center gap-3"
                    >
                        <Cover track={current.track}/>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                                {current.track.title}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {current.track.artist}
                            </p>
                        </div>
                        <Button
                            size="icon"
                            variant="plain"
                            onClick={player.toggle}
                            aria-label={player.playing ? "Pause current song" : "Resume current song"}
                        >
                            {player.playing ? (
                                <Pause/>
                            ) : (
                                <Play/>
                            )}
                        </Button>
                    </div>
                </section>
            )}
            <div className="flex shrink-0 items-center justify-between gap-3">
                <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Up next
                </h3>
                <div className="flex items-center gap-2">
                    <Button
                        size="icon-xs"
                        variant="plain"
                        disabled={!upcoming.length}
                        aria-label="Shuffle upcoming"
                        aria-pressed={player.shuffle}
                        title="Shuffle upcoming songs"
                        onClick={() => player.setShuffle(!player.shuffle)}
                    >
                        <Shuffle/>
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={!upcoming.length}
                        onClick={player.clearUpcoming}
                    >
                        Clear upcoming
                    </Button>
                </div>
            </div>
            <div className="min-h-0 flex-1">
                {upcoming.length ? (
                    <VirtualGrid
                        maxColumns={1}
                        itemHeight={68}
                        items={upcoming}
                        label="Queued songs"
                        getKey={(entry) => entry.key}
                        renderItem={(entry) => (
                            <QueuedTrackRow
                                entry={entry}
                                ordering={ordering}
                                onRemove={() => player.removeQueued(entry.key)}
                                onPlay={() => player.jumpToQueue(player.queue.findIndex((item) => item.key === entry.key))}
                            />
                        )}
                    />
                ) : (
                    <EmptyState
                        icon={ListMusic}
                        title={current ? "You’re all caught up" : "Your queue is empty"}
                        description="Right-click songs to play them next or add them to the queue."
                    />
                )}
            </div>
            {upcoming.length > 1 && (
                <p className="shrink-0 text-xs text-muted-foreground">
                    Drag a handle or use Alt + ↑ / ↓ to reorder.
                </p>
            )}
        </aside>
    );
}
