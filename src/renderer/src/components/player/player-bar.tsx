import {cn} from "@/lib/utils";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import type {PlayerState} from "@/types/player";
import {Separator} from "@/components/ui/separator";
import {RangeInput} from "@/components/ui/range-input";
import type {Track} from "../../../../shared/types/library";
import {PlaybackTimeline} from "@/components/player/playback-timeline";
import {ShowPlayingButton} from "@/components/player/show-playing-button";
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
        <footer
            className="player-bar col-span-full grid grid-cols-[minmax(0,1fr)_minmax(300px,46%)_minmax(0,1fr)] items-center gap-5 rounded-t-xl border border-b-0 border-border border-t-primary/25 bg-card px-4 py-2"
        >
            <div className="now-playing flex min-w-0 items-center gap-3 [&_.cover]:size-14 [&_.cover]:rounded-lg">
                <Cover track={current}/>
                <div className="min-w-0 flex-1 truncate">
                    <strong className="block truncate text-sm font-semibold">
                        {current?.title ?? "Nothing playing"}
                    </strong>
                    <small className="mt-1 block truncate text-xs text-muted-foreground">
                        {current?.artist ?? "Choose a song from your library"}
                    </small>
                </div>
            </div>
            <div className="transport min-w-0">
                <div className="transport-buttons mb-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-content">
                    <div className="flex justify-end">
                        <Button
                            size="icon-xl"
                            variant="plain"
                            title="Shuffle"
                            aria-label="Shuffle"
                            aria-pressed={player.shuffle}
                            className={cn(player.shuffle && "enabled")}
                            onClick={() => player.setShuffle(!player.shuffle)}
                        >
                            <Shuffle/>
                        </Button>
                    </div>
                    <div
                        aria-label="Playback controls"
                        className="flex items-center gap-2"
                    >
                        <Button
                            size="icon-xl"
                            variant="ghost"
                            disabled={!current}
                            title="Previous track"
                            aria-label="Previous track"
                            onClick={() => player.next(-1)}
                        >
                            <SkipBack/>
                        </Button>
                        <Button
                            size="icon-2xl"
                            variant="default"
                            disabled={!current}
                            onClick={player.toggle}
                            title={player.playing ? "Pause" : "Play"}
                            className="play-toggle rounded-full shadow-sm"
                            aria-label={player.playing ? "Pause" : "Play"}
                        >
                            {player.playing ? (
                                <Pause fill="currentColor"/>
                            ) : (
                                <Play fill="currentColor"/>
                            )}
                        </Button>
                        <Button
                            size="icon-xl"
                            variant="ghost"
                            title="Next track"
                            disabled={!current}
                            aria-label="Next track"
                            onClick={() => player.next()}
                        >
                            <SkipForward/>
                        </Button>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            size="icon-xl"
                            variant="plain"
                            aria-label="Repeat"
                            data-repeat={player.repeat}
                            onClick={player.cycleRepeat}
                            title={"Repeat: " + player.repeat}
                            aria-pressed={player.repeat !== "off"}
                            className={cn(player.repeat !== "off" && "enabled")}
                        >
                            {player.repeat === "one" ? (
                                <Repeat1/>
                            ) : (
                                <Repeat/>
                            )}
                        </Button>
                        <Separator
                            orientation="vertical"
                            className="mx-1 h-4 data-vertical:self-center"
                        />
                        <Button
                            title="Stop"
                            size="icon-xl"
                            variant="ghost"
                            aria-label="Stop"
                            disabled={!current}
                            onClick={player.stop}
                        >
                            <Square/>
                        </Button>
                    </div>
                </div>
                <PlaybackTimeline
                    audio={player.audio}
                    onSeek={player.seek}
                    trackId={current?.id}
                />
            </div>
            <div className="volume flex min-w-0 items-center justify-end gap-2 text-content">
                <ShowPlayingButton
                    onClick={onReveal}
                    disabled={!current}
                />
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={onQueue}
                    title="Show queue"
                    aria-label="Show queue"
                    aria-pressed={queueOpen}
                    className={cn(queueOpen && "text-primary bg-selection ring-1 ring-primary/60")}
                >
                    <ListMusic/>
                </Button>
                <Separator
                    orientation="vertical"
                    className="mx-1 h-5 data-vertical:self-center"
                />
                <Volume2
                    size={18}
                    aria-hidden="true"
                />
                <RangeInput
                    min="0"
                    max="1"
                    step="0.01"
                    aria-label="Volume"
                    value={player.volume}
                    className="w-[90px] max-[1150px]:w-15"
                    onChange={(ev) => player.setVolume(Number(ev.target.value))}
                />
            </div>
        </footer>
    );
}
