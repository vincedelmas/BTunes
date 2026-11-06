import {X} from "lucide-react";
import type {PlayerState} from "@/types/player";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import {VirtualGrid} from "@/components/virtual-grid";
import {cn} from "@/lib/utils";

interface QueuePanelProps {
    player: PlayerState;
    onClose: () => void
}


export function QueuePanel({ player, onClose }: QueuePanelProps) {
    const items = player.queue.map((track, index) => ({ track, index }));

    return (
        <aside
            aria-label="Playback queue"
            className="queue fixed right-2 top-2 bottom-[106px] w-[330px] bg-card p-5 overflow-hidden rounded-lg z-20 shadow-[-20px_0_70px_#0005] flex flex-col gap-4 [&_h2]:text-xl [&_h2]:font-[750] [&_.virtual-grid-scroll]:flex-1"
        >
            <div className="flex items-center justify-between">
                <h2>Queue</h2>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close queue"
                    onClick={onClose}
                >
                    <X/>
                </Button>
            </div>
            {!items.length && <p className="muted text-muted-foreground">Play an album or a song to get started.</p>}
            <VirtualGrid
                items={items}
                label="Queued songs"
                maxColumns={1}
                itemHeight={64}
                getKey={(item) => item.index}
                renderItem={({ track, index }) => (
                    <button
                        className={cn("queue-track flex items-center gap-3 w-full text-left border-0 rounded-[5px] bg-transparent p-2 text-xs hover:bg-secondary [&_small]:block [&_small]:mt-1 [&_span]:overflow-hidden [&_span]:text-ellipsis [&_span]:whitespace-nowrap", player.currentTrack?.id === track.id && "is-current text-primary [&_.track-cell_strong]:text-primary [&_.track-row-play]:opacity-[1]")}
                        onClick={() => player.start(track, player.queue, index)}
                    >
                        <Cover track={track}/>
                        <span>
{track.title}
                            <small className="text-[11px] text-muted-foreground">{track.artist}</small>
</span>
                    </button>
                )}
            />
        </aside>
    );
}
