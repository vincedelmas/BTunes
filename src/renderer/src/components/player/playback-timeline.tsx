import {useEffect, useRef, useState} from "react";
import type {RefObject} from "react";
import {formatTime} from "@/lib/music";

interface PlaybackTimelineProps {
    audio: RefObject<HTMLAudioElement | null>;
    trackId?: number;
    onSeek: (seconds: number) => void;
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
        <div className="timeline flex items-center gap-3 text-[10px] text-muted-foreground tabular-nums [&_input]:flex-1 [&_input]:min-w-0">
            <span className="w-9 shrink-0 text-right">{formatTime(position)}</span>
            <input
                className="h-[3px] cursor-pointer outline-none shadow-none ring-0 [accent-color:var(--primary)] focus:outline-none focus:shadow-none focus:ring-0"
                aria-label="Playback position"
                type="range"
                min="0"
                max={duration || 1}
                step="0.1"
                disabled={!trackId || !duration}
                value={Math.min(position, duration || 1)}
                onPointerDown={(ev) => {
                    scrubbing.current = true;
                    ev.currentTarget.setPointerCapture(ev.pointerId);
                }}
                onChange={(ev) => {
                    const seconds = Number(ev.target.value);
                    setPosition(seconds);
                    if (!scrubbing.current) {
                        pendingSeek.current = seconds;
                        onSeek(seconds);
                    }
                }}
                onPointerUp={(ev) => {
                    const seconds = Number(ev.currentTarget.value);
                    pendingSeek.current = seconds;
                    onSeek(seconds);
                    scrubbing.current = false;
                }}
                onPointerCancel={() => {
                    scrubbing.current = false;
                    setPosition(audio.current?.currentTime ?? 0);
                }}
            />
            <span className="w-9 shrink-0">{formatTime(duration)}</span>
        </div>
    );
}
