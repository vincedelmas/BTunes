import type {z} from "zod";

export function readPreference<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
    try {
        const result = schema.safeParse(JSON.parse(localStorage.getItem(key) ?? "null"));
        return result.success ? result.data : fallback;
    }
    catch {
        return fallback;
    }
}

export function writePreference(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    }
    catch {
        // Preferences remain usable for this session when storage is unavailable.
    }
}

export function normalizeOrder(order: string[], defaults: string[]) {
    return [...new Set([...order.filter((id) => defaults.includes(id)), ...defaults])];
}

export function moveItem(order: string[], source: string, target: string) {
    const sourceIndex = order.indexOf(source);
    const targetIndex = order.indexOf(target);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return order;

    const next = [...order];
    next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, source);
    return next;
}
