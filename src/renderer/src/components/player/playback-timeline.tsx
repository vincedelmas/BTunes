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

    useEffect(() => {
        const media = audio.current;
        if (!media) return;

        const synchronize = () => {
            setDuration(trackId && media.readyState >= 1 && Number.isFinite(media.duration) ? media.duration : 0);
            if (!scrubbing.current) setPosition(media.currentTime || 0);
        };

        const events = ["timeupdate", "loadedmetadata", "durationchange", "seeked", "emptied"];
        events.forEach((name) => media.addEventListener(name, synchronize));
        scrubbing.current = false;
        synchronize();

        return () => events.forEach((name) => media.removeEventListener(name, synchronize));
    }, [audio, trackId]);

    return (
        <div className="timeline flex items-center gap-3 text-[10px] text-muted-foreground tabular-nums [&_input]:flex-1 [&_input]:min-w-0">
            <span>{formatTime(position)}</span>
            <input
                className="h-[3px] [accent-color:var(--primary)] cursor-pointer"
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
                    if (!scrubbing.current) onSeek(seconds);
                }}
                onPointerUp={(ev) => {
                    scrubbing.current = false;
                    onSeek(Number(ev.currentTarget.value));
                }}
                onPointerCancel={() => {
                    scrubbing.current = false;
                    setPosition(audio.current?.currentTime ?? 0);
                }}
            />
            <span>{formatTime(duration)}</span>
        </div>
    );
}
