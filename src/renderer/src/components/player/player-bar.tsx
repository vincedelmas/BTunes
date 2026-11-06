import {ShowPlayingButton} from "@/components/player/show-playing-button";
import {cn} from "@/lib/utils";
import {PlaybackTimeline} from "@/components/player/playback-timeline";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import type {PlayerState} from "@/types/player";
import type {Track} from "../../../../shared/types/library";

import {ListMusic, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Square, Volume2} from "lucide-react";


interface PlayerBarProps {
    current?: Track;
    player: PlayerState;
    onQueue: () => void;
    onReveal: () => void;

}


export function PlayerBar({ player, current, onQueue, onReveal }: PlayerBarProps) {
    return (
        <footer className="player-bar col-span-full flex items-center justify-between bg-[#000] py-[10px] px-[15px] gap-5">
            <div
                className="now-playing flex w-[28%] min-w-0 items-center gap-4 [&_.cover]:size-[64px]">
                <Cover
                    track={current}
                />
                <div className="min-w-0 flex-1 truncate">
                    <strong className="block truncate text-[15px] font-medium">{current?.title ?? "Find your next favorite"}</strong>
                    <small className="mt-1 block truncate text-[13px] text-muted-foreground">{current?.artist ?? "Play something from your library"}</small>
                </div>
            </div>

            <div className="transport w-[42%] max-w-[590px]">
                <div
                    className="transport-buttons flex justify-center items-center gap-[9px] mb-2 [&_>_button]:text-muted-foreground [&_>_.enabled]:text-primary [&_>_.play-toggle]:rounded-[50%] [&_>_.play-toggle]:bg-foreground [&_>_.play-toggle]:text-[#000] [&_>_.play-toggle]:w-[34px] [&_>_.play-toggle]:h-[34px]">
                    <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Shuffle"
                        aria-pressed={player.shuffle}
                        className={cn(player.shuffle && "enabled text-primary")}
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
                        aria-label="Repeat"
                        title={"Repeat: " + player.repeat}
                        data-repeat={player.repeat}
                        aria-pressed={player.repeat !== "off"}
                        className={cn(player.repeat !== "off" && "enabled text-primary")}
                        onClick={player.cycleRepeat}
                    >
                        {player.repeat === "one" ? <Repeat1/> : <Repeat/>}
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
                    <ShowPlayingButton
                        disabled={!current}
                        onClick={onReveal}
                    />

                </div>

                <PlaybackTimeline
                    audio={player.audio}
                    trackId={current?.id}
                    onSeek={player.seek}
                />
            </div>

            <div className="volume flex items-center gap-3 text-muted-foreground [&_input]:w-[90px] max-[1150px]:[&_input]:w-15">
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
                    className="h-[3px] [accent-color:var(--primary)] cursor-pointer"
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
