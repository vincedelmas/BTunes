import {useEffect, useRef, useState} from "react";
import type {Track} from "../../../shared/contracts";
import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "@/lib/music";

export function usePlayer(onError: (message: string) => void) {
    const audio = useRef<HTMLAudioElement>(null);
    const counted = useRef(false);
    const [current, setCurrent] = useState<Track>();
    const [queue, setQueue] = useState<Track[]>([]);
    const [playing, setPlaying] = useState(false);
    const [shuffle, setShuffle] = useState(false);
    const [repeat, setRepeat] = useState(false);
    const [position, setPosition] = useState(0);
    const [volume, setVolume] = useState(0.7);

    function report(error: unknown) {
        onError(getErrorMessage(error));
    }

    function play() {
        void audio.current?.play().catch(report);
    }

    function seek(seconds: number) {
        if (audio.current) audio.current.currentTime = seconds;
        setPosition(seconds);
    }

    function start(track: Track, tracks: Track[]) {
        setQueue(tracks);
        counted.current = false;

        if (current?.id === track.id) {
            seek(0);
            play();
            return;
        }

        setPosition(0);
        setCurrent(track);
    }

    useEffect(() => {
        if (current) play();
    }, [current?.id]);

    useEffect(() => {
        if (audio.current) audio.current.volume = volume;
    }, [volume]);

    function stop() {
        audio.current?.pause();
        seek(0);
    }

    function next(direction = 1) {
        if (!current || !queue.length) return;

        const currentIndex = queue.findIndex((track) => track.id === current.id);
        let index = currentIndex + direction;

        if (shuffle && queue.length > 1) {
            // Choose a different track instead of immediately repeating the current one.
            index =
                (currentIndex + 1 + Math.floor(Math.random() * (queue.length - 1))) %
                queue.length;
        }

        if (index < 0 || index >= queue.length) {
            if (!repeat) {
                stop();
                return;
            }

            index = (index + queue.length) % queue.length;
        }

        start(queue[index], queue);
    }

    function updateTime() {
        const seconds = audio.current?.currentTime ?? 0;
        setPosition(seconds);

        if (
            current &&
            !counted.current &&
            seconds >= Math.min(30, current.duration * 0.5)
        ) {
            counted.current = true;
            void rpc("track.played", { id: current.id }).catch(report);
        }
    }

    function toggle() {
        if (playing) audio.current?.pause();
        else play();
    }

    return {
        audio,
        current,
        queue,
        playing,
        shuffle,
        repeat,
        position,
        volume,
        setPlaying,
        setShuffle,
        setRepeat,
        setVolume,
        start,
        next,
        stop,
        seek,
        toggle,
        updateTime,
    };
}

export type PlayerState = ReturnType<typeof usePlayer>;
