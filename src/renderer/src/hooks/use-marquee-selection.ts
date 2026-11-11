import {useEffect, useRef, useState} from "react";
import type {PointerEvent, RefObject} from "react";
import type {GridGeometry, GridSelection, SelectionRectangle} from "@/types/selection";


export function useMarqueeSelection(container: RefObject<HTMLDivElement | null>, keys: string[], geometry: GridGeometry, selection?: GridSelection) {
    const [rectangle, setRectangle] = useState<SelectionRectangle>();
    const drag = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        clientX: number;
        clientY: number;
        original: string[];
        additive: boolean;
        moved: boolean;
        previous: string;
    }>(undefined);
    const frame = useRef<number | undefined>(undefined);

    useEffect(() => () => {
        if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    }, []);

    function update() {
        const element = container.current;
        const current = drag.current;
        if (!element || !current || !selection) return;

        const bounds = element.getBoundingClientRect();
        const x = Math.max(0, Math.min(element.clientWidth, current.clientX - bounds.left));
        const y = Math.max(0, Math.min(element.clientHeight, current.clientY - bounds.top)) + element.scrollTop;
        const next = {
            left: Math.min(current.startX, x),
            top: Math.min(current.startY, y),
            width: Math.abs(x - current.startX),
            height: Math.abs(y - current.startY),
        };

        if (!current.moved && next.width < 4 && next.height < 4) return;
        current.moved = true;
        setRectangle(next);

        const sample = element.querySelector<HTMLElement>("[data-selection-item]");
        const row = element.querySelector(".virtual-grid-row");
        const gap = row ? parseFloat(getComputedStyle(row).columnGap) || 0 : 0;
        const columnWidth = (geometry.width - gap * (geometry.columns - 1)) / geometry.columns;
        const cardHeight = sample?.getBoundingClientRect().height ?? geometry.rowHeight;
        const matches = keys.filter((_, index) => {
            const left = index % geometry.columns * (columnWidth + gap);
            const top = Math.floor(index / geometry.columns) * geometry.rowHeight;
            return left < next.left + next.width && left + columnWidth > next.left
                && top < next.top + next.height && top + cardHeight > next.top;
        });
        const selected = current.additive ? [...new Set([...current.original, ...matches])] : matches;
        const signature = JSON.stringify(selected);

        if (signature !== current.previous) {
            current.previous = signature;
            selection.onChange(selected);
        }
    }

    function autoScroll() {
        const element = container.current;
        const current = drag.current;
        if (!element || !current) return;

        const bounds = element.getBoundingClientRect();
        const distanceTop = current.clientY - bounds.top;
        const distanceBottom = bounds.top + element.clientHeight - current.clientY;
        let delta = 0;
        if (distanceTop < 30) delta = -12;
        if (distanceBottom < 30) delta = 12;

        if (delta && current.moved) {
            element.scrollBy(0, delta);
            update();
        }

        frame.current = requestAnimationFrame(autoScroll);
    }

    function onPointerDown(ev: PointerEvent<HTMLDivElement>) {
        if (!selection || ev.button !== 0 || (ev.target as HTMLElement).closest("[data-selection-item],button,input,[role=menu]")) return;
        if (ev.clientX >= ev.currentTarget.getBoundingClientRect().left + ev.currentTarget.clientWidth) return;

        ev.preventDefault();
        ev.currentTarget.focus();
        ev.currentTarget.setPointerCapture(ev.pointerId);

        const bounds = ev.currentTarget.getBoundingClientRect();

        drag.current = {
            moved: false,
            previous: "",
            clientX: ev.clientX,
            clientY: ev.clientY,
            pointerId: ev.pointerId,
            original: selection.keys,
            startX: ev.clientX - bounds.left,
            additive: ev.ctrlKey || ev.metaKey || ev.shiftKey,
            startY: ev.clientY - bounds.top + ev.currentTarget.scrollTop,
        };

        frame.current = requestAnimationFrame(autoScroll);
    }

    function onPointerMove(ev: PointerEvent<HTMLDivElement>) {
        if (!drag.current || drag.current.pointerId !== ev.pointerId) return;

        drag.current.clientX = ev.clientX;
        drag.current.clientY = ev.clientY;

        update();
    }

    function finish(ev: PointerEvent<HTMLDivElement>, cancelled = false) {
        const current = drag.current;
        if (!current || current.pointerId !== ev.pointerId) return;

        if (cancelled) {
            selection?.onChange(current.original);
        }
        else if (!current.moved && !current.additive) {
            selection?.onChange([]);
        }

        drag.current = undefined;
        setRectangle(undefined);

        if (frame.current !== undefined) {
            cancelAnimationFrame(frame.current);
        }

        if (ev.currentTarget.hasPointerCapture(ev.pointerId)) {
            ev.currentTarget.releasePointerCapture(ev.pointerId);
        }
    }

    return {
        rectangle,
        onPointerDown,
        onPointerMove,
        onPointerUp: (ev: PointerEvent<HTMLDivElement>) => finish(ev),
        onPointerCancel: (ev: PointerEvent<HTMLDivElement>) => finish(ev, true)
    };
}
