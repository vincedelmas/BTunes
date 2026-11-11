import {rpc} from "@/lib/rpc";
import type {RepeatMode} from "@/types/player";
import {usePreference} from "@/hooks/use-preference";
import {getErrorMessage} from "../../../shared/errors";
import type {Track} from "../../../shared/types/library";
import {volumeSchema} from "../../../shared/schemas/preferences";
import {useEffect, useEffectEvent, useRef, useState} from "react";
import type {PlaybackQueue} from "../../../shared/types/playback-queue";
import {clearUpcoming, removeQueuedTrack, reorderUpcoming, restoreUpcoming, shuffleUpcoming} from "../../../shared/playback-queue";


export function usePlayer(onError: (message: string) => void) {
    const sequence = useRef(0);
    const queueRef = useRef<PlaybackQueue>({ entries: [], index: -1 });
    const [queue, setQueue] = useState<PlaybackQueue>({ entries: [], index: -1 });
    const shuffleEnabled = useRef(false);
    const unshuffledOrder = useRef<number[]>([]);
    const counted = useRef(false);
    const [currentTrack, setCurrentTrack] = useState<Track>();
    const [volume, setVolume] = usePreference("btunes.volume.v1", volumeSchema, 0.7);
    const [repeat, setRepeat] = useState<RepeatMode>("off");
    const [playing, setPlaying] = useState(false);
    const [shuffle, updateShuffle] = useState(false);

    const audio = useRef<HTMLAudioElement>(null);

    const report = (error: unknown) => onError(getErrorMessage(error));

    const play = () => {
        void audio.current?.play().catch((error: unknown) => {
            // Switching tracks or pressing Stop can interrupt a pending browser play request.
            if (error instanceof DOMException && error.name === "AbortError") return;
            report(error);
        });
    };

    const seek = (seconds: number) => {
        const media = audio.current;
        if (!media || !Number.isFinite(seconds) || !Number.isFinite(media.duration)) return;

        media.currentTime = Math.max(0, Math.min(seconds, Math.max(0, media.duration - 0.01)));
    };

    function updateQueue(next: PlaybackQueue) {
        queueRef.current = next;
        setQueue(next);
    }

    function playTrack(track: Track) {
        counted.current = false;

        if (currentTrack?.id === track.id) {
            seek(0);
            play();
            return;
        }

        setCurrentTrack(track);
    }

    function start(track: Track, tracks: Track[], index?: number) {
        const selected = index ?? tracks.findIndex((item) => item.id === track.id);
        const validIndex = Number.isInteger(selected) && selected >= 0 && selected < tracks.length;
        const source = validIndex ? tracks : [track, ...tracks];
        const entries = source.map((item) => ({ key: ++sequence.current, track: item }));
        const nextIndex = validIndex ? selected : 0;
        let next = { entries, index: nextIndex };

        if (shuffleEnabled.current) {
            next = { entries: [entries[nextIndex], ...entries.filter((_, index) => index !== nextIndex)], index: 0 };
            unshuffledOrder.current = next.entries.slice(1).map((entry) => entry.key);
            next = shuffleUpcoming(next);
        }

        updateQueue(next);
        playTrack(track);
    }

    function jumpToQueue(index: number) {
        const currentQueue = queueRef.current;
        const entry = currentQueue.entries[index];
        if (!entry) return;

        updateQueue({ ...currentQueue, index });
        playTrack(entry.track);
    }

    function setShuffle(enabled: boolean) {
        if (shuffleEnabled.current === enabled) return;
        shuffleEnabled.current = enabled;
        updateShuffle(enabled);
        if (enabled) {
            unshuffledOrder.current = queueRef.current.entries.slice(queueRef.current.index + 1).map((entry) => entry.key);
            updateQueue(shuffleUpcoming(queueRef.current));
        }
        else {
            updateQueue(restoreUpcoming(queueRef.current, unshuffledOrder.current));
        }
    }

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
        const currentQueue = queueRef.current;
        if (!currentTrack || !currentQueue.entries.length) return;

        let index = currentQueue.index + direction;
        const length = currentQueue.entries.length;

        if (index < 0 || index >= length) {
            if (repeat === "off") {
                audio.current?.pause();
                return;
            }

            index = (index + length) % length;
        }

        jumpToQueue(index);
    }

    function cycleRepeat() {
        setRepeat((previous) => {
            if (previous === "off") return "all";
            if (previous === "all") return "one";
            return "off";
        });
    }

    function ended() {
        if (repeat === "one" && currentTrack) {
            counted.current = false;
            seek(0);
            play();
            return;
        }

        next();
    }

    function enqueue(tracks: Track[], playNext = false) {
        if (!tracks.length) return;

        if (!currentTrack) {
            start(tracks[0], tracks);
            return;
        }

        const currentQueue = queueRef.current;
        const entries = tracks.map((track) => ({ key: ++sequence.current, track }));
        const index = playNext ? currentQueue.index + 1 : currentQueue.entries.length;
        if (shuffleEnabled.current) {
            const keys = entries.map((entry) => entry.key);
            unshuffledOrder.current = playNext ? [...keys, ...unshuffledOrder.current] : [...unshuffledOrder.current, ...keys];
        }
        updateQueue({
            entries: [...currentQueue.entries.slice(0, index), ...entries, ...currentQueue.entries.slice(index)],
            index: currentQueue.index,
        });
    }

    function updateTime() {
        const media = audio.current;
        if (!currentTrack || counted.current || !media || media.paused || media.seeking) return;

        const duration = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : currentTrack.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;
        if (media.currentTime < Math.min(30, duration * 0.5)) return;

        // Progress belongs to the timeline, never to the library's React tree.
        counted.current = true;
        void rpc("track.played", { id: currentTrack.id }).catch(report);
    }

    function toggle() {
        if (playing) audio.current?.pause();
        else play();
    }

    return {
        play,
        next,
        stop,
        seek,
        audio,
        queue: queue.entries,
        queueIndex: queue.index,
        jumpToQueue,
        removeQueued: (key: number) => updateQueue(removeQueuedTrack(queueRef.current, key)),
        reorderUpcoming: (keys: number[]) => {
            updateQueue(reorderUpcoming(queueRef.current, keys));
            unshuffledOrder.current = queueRef.current.entries.slice(queueRef.current.index + 1).map((entry) => entry.key);
        },
        clearUpcoming: () => updateQueue(clearUpcoming(queueRef.current)),
        start,
        toggle,
        repeat,
        volume,
        currentTrack,
        shuffle,
        playing,
        enqueue,
        cycleRepeat,
        ended,
        setVolume,
        setPlaying,
        setShuffle,
        updateTime,
    };
}
