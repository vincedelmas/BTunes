import {useState} from "react";
import type {DragEvent, KeyboardEvent} from "react";
import {moveItem} from "@/lib/preferences";

export function useDragOrder(order: string[], onChange: (order: string[]) => void, group: string) {
    const [dragging, setDragging] = useState<string>();
    const format = "application/x-btunes-" + group;

    function start(ev: DragEvent, id: string) {
        ev.dataTransfer.setData(format, id);
        ev.dataTransfer.effectAllowed = "move";
        setDragging(id);
    }

    function over(ev: DragEvent) {
        if (!ev.dataTransfer.types.includes(format)) return;
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "move";
    }

    function drop(ev: DragEvent, target: string) {
        const source = ev.dataTransfer.getData(format);
        if (!source) return;
        ev.preventDefault();
        ev.stopPropagation();
        onChange(moveItem(order, source, target));
        setDragging(undefined);
    }

    function keyDown(ev: KeyboardEvent, id: string) {
        if (!ev.altKey) return;
        const forward = ev.key === "ArrowRight" || ev.key === "ArrowDown";
        const backward = ev.key === "ArrowLeft" || ev.key === "ArrowUp";
        if (!forward && !backward) return;

        ev.preventDefault();
        const target = order[order.indexOf(id) + (forward ? 1 : -1)];
        if (target) onChange(moveItem(order, id, target));
    }

    return { dragging, start, over, drop, keyDown, end: () => setDragging(undefined) };
}
