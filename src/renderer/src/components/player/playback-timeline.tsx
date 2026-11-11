import type {RefObject} from "react";
import {formatTime} from "@/lib/music";
import {useEffect, useRef, useState} from "react";
import {RangeInput} from "@/components/ui/range-input";


interface PlaybackTimelineProps {
    trackId?: number;
    onSeek: (seconds: number) => void;
    audio: RefObject<HTMLAudioElement | null>;
}


export function PlaybackTimeline({ audio, trackId, onSeek }: PlaybackTimelineProps) {
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const scrubbing = useRef(false);
    const pendingSeek = useRef<number | undefined>(undefined);

    useEffect(() => {
        const media = audio.current;
        if (!media) return;

        const synchronize = () => {
            setDuration(trackId && media.readyState >= 1 && Number.isFinite(media.duration) ? media.duration : 0);
            if (scrubbing.current || media.seeking) return;
            if (pendingSeek.current !== undefined && Math.abs(media.currentTime - pendingSeek.current) > 0.5) return;
            pendingSeek.current = undefined;
            setPosition(media.currentTime || 0);
        };

        const events = ["timeupdate", "loadedmetadata", "durationchange", "seeked", "emptied"];
        events.forEach((name) => media.addEventListener(name, synchronize));
        scrubbing.current = false;
        pendingSeek.current = undefined;
        synchronize();

        return () => events.forEach((name) => media.removeEventListener(name, synchronize));
    }, [audio, trackId]);

    return (
        <div
            className="timeline flex items-center gap-3 text-xs text-muted-foreground tabular-nums [&_input]:flex-1 [&_input]:min-w-0"
        >
            <span className="w-9 shrink-0 text-right">
                {formatTime(position)}
            </span>
            <RangeInput
                min="0"
                step="0.1"
                max={duration || 1}
                aria-label="Playback position"
                disabled={!trackId || !duration}
                value={Math.min(position, duration || 1)}
                className="focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4"
                onPointerCancel={() => {
                    scrubbing.current = false;
                    setPosition(audio.current?.currentTime ?? 0);
                }}
                onPointerDown={(ev) => {
                    scrubbing.current = true;
                    ev.currentTarget.setPointerCapture(ev.pointerId);
                }}
                onPointerUp={(ev) => {
                    const seconds = Number(ev.currentTarget.value);
                    pendingSeek.current = seconds;
                    onSeek(seconds);
                    scrubbing.current = false;
                }}
                onChange={(ev) => {
                    const seconds = Number(ev.target.value);
                    setPosition(seconds);
                    if (!scrubbing.current) {
                        pendingSeek.current = seconds;
                        onSeek(seconds);
                    }
                }}
            />
            <span className="w-9 shrink-0">
                {formatTime(duration)}
            </span>
        </div>
    );
}
