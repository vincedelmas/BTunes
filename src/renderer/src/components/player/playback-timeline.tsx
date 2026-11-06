import {useEffect, useRef, useState} from "react";
import type {RefObject} from "react";
import {formatTime} from "@/lib/music";

export function PlaybackTimeline({ audio, trackId, onSeek }: {
    audio: RefObject<HTMLAudioElement | null>;
    trackId?: number;
    onSeek: (seconds: number) => void;
}) {
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
        <div className="timeline">
            <span>{formatTime(position)}</span>
            <input
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
