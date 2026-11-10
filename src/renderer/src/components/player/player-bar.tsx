import {ShowPlayingButton} from "@/components/player/show-playing-button";
import {cn} from "@/lib/utils";
import {PlaybackTimeline} from "@/components/player/playback-timeline";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import {Separator} from "@/components/ui/separator";
import {RangeInput} from "@/components/ui/range-input";
import type {PlayerState} from "@/types/player";
import type {Track} from "../../../../shared/types/library";

import {ListMusic, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Square, Volume2} from "lucide-react";


interface PlayerBarProps {
    current?: Track;
    queueOpen: boolean;
    player: PlayerState;
    onQueue: () => void;
    onReveal: () => void;
}


export function PlayerBar({ player, current, queueOpen, onQueue, onReveal }: PlayerBarProps) {
    return (
        <footer className="player-bar col-span-full grid grid-cols-[minmax(0,1fr)_minmax(300px,46%)_minmax(0,1fr)] items-center gap-5 rounded-t-xl border border-b-0 border-border border-t-primary/25 bg-card px-4 py-2">
            <div
                className="now-playing flex min-w-0 items-center gap-3 [&_.cover]:size-14 [&_.cover]:rounded-lg">
                <Cover
                    track={current}
                />
                <div className="min-w-0 flex-1 truncate">
                    <strong className="block truncate text-sm font-semibold">{current?.title ?? "Nothing playing"}</strong>
                    <small className="mt-1 block truncate text-xs text-muted-foreground">{current?.artist ?? "Choose a song from your library"}</small>
                </div>
            </div>

            <div className="transport min-w-0">
                <div
                    className="transport-buttons mb-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-content">
                    <div className="flex justify-end">
                        <Button
                            size="icon"
                            variant="plain"
                            aria-label="Shuffle"
                            title="Shuffle"
                            aria-pressed={player.shuffle}
                            className={cn(player.shuffle && "enabled")}
                            onClick={() => player.setShuffle(!player.shuffle)}
                        >
                            <Shuffle/>
                        </Button>
                    </div>
                    <div className="flex items-center gap-2" aria-label="Playback controls">
                        <Button
                            size="icon"
                            variant="ghost"
                            disabled={!current}
                            aria-label="Previous track"
                            title="Previous track"
                            onClick={() => player.next(-1)}
                        >
                            <SkipBack/>
                        </Button>
                        <Button
                            size="icon"
                            variant="default"
                            disabled={!current}
                            className="play-toggle size-10 rounded-full shadow-sm"
                            onClick={player.toggle}
                            aria-label={player.playing ? "Pause" : "Play"}
                            title={player.playing ? "Pause" : "Play"}
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
                            title="Next track"
                            onClick={() => player.next()}
                        >
                            <SkipForward/>
                        </Button>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            size="icon"
                            variant="plain"
                            aria-label="Repeat"
                            title={"Repeat: " + player.repeat}
                            data-repeat={player.repeat}
                            aria-pressed={player.repeat !== "off"}
                            className={cn(player.repeat !== "off" && "enabled")}
                            onClick={player.cycleRepeat}
                        >
                            {player.repeat === "one" ? <Repeat1/> : <Repeat/>}
                        </Button>
                        <Separator orientation="vertical" className="mx-1 h-4 data-vertical:self-center"/>
                        <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Stop"
                            title="Stop"
                            disabled={!current}
                            onClick={player.stop}
                        >
                            <Square/>
                        </Button>
                    </div>
                </div>

                <PlaybackTimeline
                    audio={player.audio}
                    trackId={current?.id}
                    onSeek={player.seek}
                />
            </div>

            <div className="volume flex min-w-0 items-center justify-end gap-2 text-content">
                <ShowPlayingButton disabled={!current} onClick={onReveal}/>
                <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Show queue"
                    aria-pressed={queueOpen}
                    className={cn(queueOpen && "text-primary bg-selection ring-1 ring-primary/60")}
                    title="Show queue"
                    onClick={onQueue}
                >
                    <ListMusic/>
                </Button>
                <Separator orientation="vertical" className="mx-1 h-5 data-vertical:self-center"/>
                <Volume2
                    size={18}
                    aria-hidden="true"
                />
                <RangeInput
                    className="w-[90px] max-[1150px]:w-15"
                    min="0"
                    max="1"
                    step="0.01"
                    aria-label="Volume"
                    value={player.volume}
                    onChange={(ev) => player.setVolume(Number(ev.target.value))}
                />
            </div>
        </footer>
    );
}
