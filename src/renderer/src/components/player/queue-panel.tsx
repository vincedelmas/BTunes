import type {PlayerState} from "@/hooks/use-player";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";

export function QueuePanel({
                               player,
                               onClose,
                           }: {
    player: PlayerState;
    onClose: () => void;
}) {
    return (
        <aside className="queue">
            <div className="flex items-center justify-between">
                <h2>Queue</h2>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    Close
                </Button>
            </div>

            {!player.queue.length && (
                <p className="muted">Play an album or a song to get started.</p>
            )}

            {player.queue.map((track, index) => (
                <button
                    key={track.id + ":" + index}
                    className={cn(
                        "queue-track",
                        player.current?.id === track.id && "is-current",
                    )}
                    onClick={() => player.start(track, player.queue)}
                >
                    <Cover track={track}/>
                    <span>
            {track.title}
                        <small>{track.artist}</small>
          </span>
                </button>
            ))}
        </aside>
    );
}
