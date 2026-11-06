import type {PlayerState} from "@/hooks/use-player";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import {VirtualGrid} from "@/components/virtual-grid";
import {cn} from "@/lib/utils";

export function QueuePanel({ player, onClose }: { player: PlayerState; onClose: () => void }) {
    const items = player.queue.map((track, index) => ({ track, index }));

    return (
        <aside className="queue">
            <div className="flex items-center justify-between">
                <h2>Queue</h2>
                <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            </div>
            {!items.length && <p className="muted">Play an album or a song to get started.</p>}
            <VirtualGrid items={items} label="Queued songs" maxColumns={1} itemHeight={64} getKey={(item) => item.index}
                         renderItem={({ track, index }) => (
                             <button className={cn("queue-track", player.current?.id === track.id && "is-current")} onClick={() => player.start(track, player.queue, index)}>
                                 <Cover track={track}/>
                                 <span>{track.title}<small>{track.artist}</small>
</span>
                             </button>
                         )}
            />
        </aside>
    );
}
