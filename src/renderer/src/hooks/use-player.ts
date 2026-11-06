import {usePreference} from "@/hooks/use-preference";
import {volumeSchema} from "../../../shared/schemas/preferences";
import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "@/lib/music";
import type {Track} from "../../../shared/types/library";
import {useEffect, useEffectEvent, useRef, useState} from "react";


export function usePlayer(onError: (message: string) => void) {
    const cursor = useRef(0);
    const counted = useRef(false);
    const [currentTrack, setCurrentTrack] = useState<Track>();
    const [queue, setQueue] = useState<Track[]>([]);
    const [volume, setVolume] = usePreference("btunes.volume.v1", volumeSchema, 0.7);
    const [repeat, setRepeat] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [shuffle, setShuffle] = useState(false);

    const audio = useRef<HTMLAudioElement>(null);

    const report = (error: unknown) => onError(getErrorMessage(error));

    const play = () => {
        void audio.current?.play().catch(report);
    };

    const seek = (seconds: number) => {
        const media = audio.current;
        if (!media || !Number.isFinite(seconds) || !Number.isFinite(media.duration)) return;

        media.currentTime = Math.max(0, Math.min(seconds, Math.max(0, media.duration - 0.01)));
    };

    const start = (track: Track, tracks: Track[], index?: number) => {
        const nextIndex = index ?? tracks.findIndex((item) => item.id === track.id);
        cursor.current = Math.max(0, nextIndex);
        setQueue([...tracks]);
        counted.current = false;

        if (currentTrack?.id === track.id) {
            seek(0);
            play();
            return;
        }

        setCurrentTrack(track);
    };

    const currentTrackId = currentTrack?.id;
    const playOnTrackChange = useEffectEvent(play);

    useEffect(() => {
        if (currentTrackId) playOnTrackChange();
    }, [currentTrackId]);

    useEffect(() => {
        if (audio.current) audio.current.volume = volume;
    }, [volume]);

    function stop() {
        audio.current?.pause();
        seek(0);
    }

    function next(direction = 1) {
        if (!currentTrack || !queue.length) return;

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

    const enqueue = (tracks: Track[], playNext = false) => {
        if (!tracks.length) return;

        if (!currentTrack) {
            start(tracks[0], tracks);
            return;
        }

        setQueue((previous) => {
            if (!playNext) return [...previous, ...tracks];

            const index = cursor.current;
            return [...previous.slice(0, index + 1), ...tracks, ...previous.slice(index + 1)];
        });
    };

    function updateTime() {
        const seconds = audio.current?.currentTime ?? 0;

        // Progress belongs to the timeline, never to the library's React tree.
        if (currentTrack && !counted.current && seconds >= Math.min(30, currentTrack.duration * 0.5)) {
            counted.current = true;
            void rpc("track.played", { id: currentTrack.id }).catch(report);
        }
    }

    function toggle() {
        if (playing) audio.current?.pause();
        else play();
    }

    return {
        next,
        stop,
        seek,
        audio,
        queue,
        start,
        toggle,
        repeat,
        volume,
        currentTrack,
        shuffle,
        playing,
        enqueue,
        setRepeat,
        setVolume,
        setPlaying,
        setShuffle,
        updateTime,
    };
}
