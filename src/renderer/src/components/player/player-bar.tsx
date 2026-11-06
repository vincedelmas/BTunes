import {cn} from "@/lib/utils";
import {PlaybackTimeline} from "@/components/player/playback-timeline";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import type {PlayerState} from "@/types/player";
import type {Track} from "../../../../shared/types/library";

import {ListMusic, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Square, Volume2} from "lucide-react";


interface PlayerBarProps {
    current?: Track;
    player: PlayerState;
    onQueue: () => void;

}


export function PlayerBar({ player, current, onQueue }: PlayerBarProps) {
    return (
        <footer className="player-bar">
            <div className="now-playing">
                <Cover
                    track={current}
                />
                <div className="truncate">
                    <strong>{current?.title ?? "Find your next favorite"}</strong>
                    <small>{current?.artist ?? "Play something from your library"}</small>
                </div>
            </div>

            <div className="transport">
                <div className="transport-buttons">
                    <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Shuffle"
                        aria-pressed={player.shuffle}
                        className={cn(player.shuffle && "enabled")}
                        onClick={() => player.setShuffle(!player.shuffle)}
                    >
                        <Shuffle/>
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        disabled={!current}
                        aria-label="Previous track"
                        onClick={() => player.next(-1)}
                    >
                        <SkipBack/>
                    </Button>
                    <Button
                        size="icon"
                        variant="secondary"
                        disabled={!current}
                        className="play-toggle"
                        onClick={player.toggle}
                        aria-label={player.playing ? "Pause" : "Play"}
                    >
                        {player.playing
                            ? <Pause fill="currentColor"/>
                            : <Play fill="currentColor"/>
                        }
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        disabled={!current}
                        aria-label="Next track"
                        onClick={() => player.next()}
                    >
                        <SkipForward/>
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Repeat queue"
                        aria-pressed={player.repeat}
                        className={cn(player.repeat && "enabled")}
                        onClick={() => player.setRepeat(!player.repeat)}
                    >
                        <Repeat/>
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Stop"
                        disabled={!current}
                        onClick={player.stop}
                    >
                        <Square/>
                    </Button>
                </div>

                <PlaybackTimeline
                    audio={player.audio}
                    trackId={current?.id}
                    onSeek={player.seek}
                />
            </div>

            <div className="volume">
                <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Show queue"
                    onClick={onQueue}
                >
                    <ListMusic/>
                </Button>
                <Volume2
                    size={18}
                    aria-hidden="true"
                />
                <input
                    min="0"
                    max="1"
                    step="0.01"
                    type="range"
                    aria-label="Volume"
                    value={player.volume}
                    onChange={(ev) => player.setVolume(Number(ev.target.value))}
                />
            </div>
        </footer>
    );
}
