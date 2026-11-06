import {useCallback, useEffect, useRef, useState} from "react";
import type {Track} from "../../../shared/contracts";
import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "@/lib/music";

export function usePlayer(onError: (message: string) => void) {
    const audio = useRef<HTMLAudioElement>(null);
    const counted = useRef(false);
    const cursor = useRef(0);
    const [current, setCurrent] = useState<Track>();
    const [queue, setQueue] = useState<Track[]>([]);
    const [playing, setPlaying] = useState(false);
    const [shuffle, setShuffle] = useState(false);
    const [repeat, setRepeat] = useState(false);
    const [volume, setVolume] = useState(0.7);

    const report = useCallback((error: unknown) => onError(getErrorMessage(error)), [onError]);

    const play = useCallback(() => {
        void audio.current?.play().catch(report);
    }, [report]);

    const seek = useCallback((seconds: number) => {
        const media = audio.current;
        if (!media || !Number.isFinite(seconds) || !Number.isFinite(media.duration)) return;

        media.currentTime = Math.max(0, Math.min(seconds, Math.max(0, media.duration - 0.01)));
    }, []);

    const start = useCallback((track: Track, tracks: Track[], index = tracks.findIndex((item) => item.id === track.id)) => {
        cursor.current = Math.max(0, index);
        setQueue([...tracks]);
        counted.current = false;

        if (current?.id === track.id) {
            seek(0);
            play();
            return;
        }

        setCurrent(track);
    }, [current?.id, seek, play]);

    useEffect(() => {
        if (current) play();
    }, [current?.id, play]);

    useEffect(() => {
        if (audio.current) audio.current.volume = volume;
    }, [volume]);

    function stop() {
        audio.current?.pause();
        seek(0);
    }

    function next(direction = 1) {
        if (!current || !queue.length) return;

        const currentIndex = cursor.current;
        let index = currentIndex + direction;

        if (shuffle && queue.length > 1) {
            index = (currentIndex + 1 + Math.floor(Math.random() * (queue.length - 1))) % queue.length;
        }

        if (index < 0 || index >= queue.length) {
            if (!repeat) {
                audio.current?.pause();
                return;
            }

            index = (index + queue.length) % queue.length;
        }

        start(queue[index], queue, index);
    }

    const enqueue = useCallback((tracks: Track[], playNext = false) => {
        if (!tracks.length) return;

        if (!current) {
            start(tracks[0], tracks);
            return;
        }

        setQueue((previous) => {
            if (!playNext) return [...previous, ...tracks];

            const index = cursor.current;
            return [...previous.slice(0, index + 1), ...tracks, ...previous.slice(index + 1)];
        });
    }, [current, start]);

    function updateTime() {
        const seconds = audio.current?.currentTime ?? 0;

        // Progress belongs to the timeline, never to the library's React tree.
        if (current && !counted.current && seconds >= Math.min(30, current.duration * 0.5)) {
            counted.current = true;
            void rpc("track.played", { id: current.id }).catch(report);
        }
    }

    function toggle() {
        if (playing) audio.current?.pause();
        else play();
    }

    return {
        audio, current, queue, playing, shuffle, repeat, volume,
        setPlaying, setShuffle, setRepeat, setVolume,
        start, next, stop, seek, toggle, updateTime, enqueue,
    };
}

export type PlayerState = ReturnType<typeof usePlayer>;
