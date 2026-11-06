import {SelectionModifiers} from "@/types/selection";
import {Dispatch, SetStateAction, useRef} from "react";


export function useListSelection<T extends string | number>(ids: T[], selected: T[], onChange: Dispatch<SetStateAction<T[]>>) {
    const selectedIds = new Set(selected);
    const anchor = useRef<T | undefined>(undefined);

    function select(id: T, ev: SelectionModifiers) {
        const additive = ev.ctrlKey || ev.metaKey;

        if (ev.shiftKey) {
            const index = ids.indexOf(id);
            const anchorIndex = anchor.current === undefined ? -1 : ids.indexOf(anchor.current);

            const start = anchorIndex < 0 ? index : anchorIndex;
            const range = ids.slice(Math.min(start, index), Math.max(start, index) + 1);

            onChange((previous) => additive ? [...new Set([...previous, ...range])] : range);
            if (anchorIndex < 0) anchor.current = id;

            return;
        }

        anchor.current = id;

        if (additive) {
            onChange((prev) => prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]);
            return;
        }

        onChange([id]);
    }

    function ensureSelected(id: T) {
        if (selectedIds.has(id)) return;

        anchor.current = id;
        onChange([id]);
    }

    return { select, ensureSelected };
}
