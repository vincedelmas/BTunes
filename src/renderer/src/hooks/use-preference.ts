import {useEffect, useState} from "react";
import type {z} from "zod";
import {readPreference, writePreference} from "@/lib/preferences";

export function usePreference<T>(key: string, schema: z.ZodType<T>, fallback: T) {
    const [value, setValue] = useState(() => readPreference(key, schema, fallback));

    useEffect(() => writePreference(key, value), [key, value]);

    return [value, setValue] as const;
}
