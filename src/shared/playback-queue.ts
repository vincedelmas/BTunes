import type {PlaybackQueue} from "./types/playback-queue.ts";


export const removeQueuedTrack = (queue: PlaybackQueue, key: number): PlaybackQueue => {
    const index = queue.entries.findIndex((entry) => entry.key === key);
    if (index < 0 || index === queue.index) return queue;

    return {
        index: index < queue.index ? queue.index - 1 : queue.index,
        entries: queue.entries.filter((entry) => entry.key !== key),
    };
};


export const reorderUpcoming = (queue: PlaybackQueue, keys: number[]): PlaybackQueue => {
    const upcoming = queue.entries.slice(queue.index + 1);
    const entries = new Map(upcoming.map((entry) => [entry.key, entry]));

    if (
        keys.length !== upcoming.length
        || new Set(keys).size !== keys.length
        || keys.some((key) => !entries.has(key))
    ) {
        return queue;
    }

    return {
        index: queue.index,
        entries: [...queue.entries.slice(0, queue.index + 1), ...keys.map((key) => entries.get(key)!)],
    };
};


export const clearUpcoming = (queue: PlaybackQueue): PlaybackQueue => {
    return {
        index: queue.index,
        entries: queue.entries.slice(0, queue.index + 1),
    };
}


export const shuffleUpcoming = (queue: PlaybackQueue, random = Math.random): PlaybackQueue => {
    const upcoming = queue.entries.slice(queue.index + 1);

    for (let index = upcoming.length - 1; index > 0; index--) {
        const target = Math.floor(random() * (index + 1));
        [upcoming[index], upcoming[target]] = [upcoming[target], upcoming[index]];
    }

    return {
        index: queue.index,
        entries: [...queue.entries.slice(0, queue.index + 1), ...upcoming],
    };
};


export const restoreUpcoming = (queue: PlaybackQueue, keys: number[]): PlaybackQueue => {
    const pos = new Map(keys.map((key, index) => [key, index]));

    const upcoming = queue.entries
        .slice(queue.index + 1)
        .toSorted((first, second) => ((pos.get(first.key) ?? Infinity) - (pos.get(second.key) ?? Infinity) || first.key - second.key));

    return {
        index: queue.index,
        entries: [...queue.entries.slice(0, queue.index + 1), ...upcoming],
    };
};
