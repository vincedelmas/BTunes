import type {PlaybackQueue} from "./types/playback-queue.ts";


export function removeQueuedTrack(queue: PlaybackQueue, key: number): PlaybackQueue {
    const index = queue.entries.findIndex((entry) => entry.key === key);
    if (index < 0 || index === queue.index) return queue;

    return {
        entries: queue.entries.filter((entry) => entry.key !== key),
        index: index < queue.index ? queue.index - 1 : queue.index,
    };
}


export function reorderUpcoming(queue: PlaybackQueue, keys: number[]): PlaybackQueue {
    const upcoming = queue.entries.slice(queue.index + 1);
    const entries = new Map(upcoming.map((entry) => [entry.key, entry]));
    if (keys.length !== upcoming.length || new Set(keys).size !== keys.length || keys.some((key) => !entries.has(key))) return queue;

    return {
        entries: [...queue.entries.slice(0, queue.index + 1), ...keys.map((key) => entries.get(key)!)],
        index: queue.index,
    };
}


export function clearUpcoming(queue: PlaybackQueue): PlaybackQueue {
    return { entries: queue.entries.slice(0, queue.index + 1), index: queue.index };
}


export function shuffleUpcoming(queue: PlaybackQueue, random = Math.random): PlaybackQueue {
    const upcoming = queue.entries.slice(queue.index + 1);

    for (let index = upcoming.length - 1; index > 0; index--) {
        const target = Math.floor(random() * (index + 1));
        [upcoming[index], upcoming[target]] = [upcoming[target], upcoming[index]];
    }

    return { entries: [...queue.entries.slice(0, queue.index + 1), ...upcoming], index: queue.index };
}


export function restoreUpcoming(queue: PlaybackQueue, keys: number[]): PlaybackQueue {
    const positions = new Map(keys.map((key, index) => [key, index]));
    const upcoming = queue.entries.slice(queue.index + 1).toSorted((first, second) => (
        (positions.get(first.key) ?? Infinity) - (positions.get(second.key) ?? Infinity) || first.key - second.key
    ));

    return { entries: [...queue.entries.slice(0, queue.index + 1), ...upcoming], index: queue.index };
}
