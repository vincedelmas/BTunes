import {useEffect, useRef, useState} from "react";
import type {CSSProperties, KeyboardEvent, PointerEvent} from "react";

export function useMovablePanel() {
    const panel = useRef<HTMLDivElement>(null);
    const grab = useRef<{ x: number; y: number } | undefined>(undefined);
    const [position, setPosition] = useState<{ x: number; y: number }>();

    function move(x: number, y: number) {
        const bounds = panel.current?.getBoundingClientRect();
        if (!bounds) return;
        setPosition({
            x: Math.max(0, Math.min(x, window.innerWidth - bounds.width)),
            y: Math.max(0, Math.min(y, window.innerHeight - bounds.height)),
        });
    }

    function pointerDown(ev: PointerEvent<HTMLElement>) {
        if (ev.button !== 0 || (ev.target as HTMLElement).closest("button,input")) return;
        const bounds = panel.current?.getBoundingClientRect();
        if (!bounds) return;
        ev.preventDefault();
        grab.current = { x: ev.clientX - bounds.left, y: ev.clientY - bounds.top };
        ev.currentTarget.setPointerCapture(ev.pointerId);
    }

    function pointerMove(ev: PointerEvent<HTMLElement>) {
        if (!grab.current) return;
        move(ev.clientX - grab.current.x, ev.clientY - grab.current.y);
    }

    function pointerUp() {
        grab.current = undefined;
    }

    function keyDown(ev: KeyboardEvent) {
        if (!ev.altKey || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(ev.key)) return;
        const bounds = panel.current?.getBoundingClientRect();
        if (!bounds) return;
        ev.preventDefault();
        const x = bounds.left + (ev.key === "ArrowRight" ? 16 : 0) - (ev.key === "ArrowLeft" ? 16 : 0);
        const y = bounds.top + (ev.key === "ArrowDown" ? 16 : 0) - (ev.key === "ArrowUp" ? 16 : 0);
        move(x, y);
    }

    useEffect(() => {
        function keepInView() {
            const bounds = panel.current?.getBoundingClientRect();
            if (!bounds) return;
            setPosition((previous) => previous && {
                x: Math.max(0, Math.min(previous.x, window.innerWidth - bounds.width)),
                y: Math.max(0, Math.min(previous.y, window.innerHeight - bounds.height)),
            });
        }

        window.addEventListener("resize", keepInView);
        return () => window.removeEventListener("resize", keepInView);
    }, []);

    const style: CSSProperties | undefined = position && { left: position.x, top: position.y, translate: "none", transform: "none" };
    const handleProps = { onPointerDown: pointerDown, onPointerMove: pointerMove, onPointerUp: pointerUp, onPointerCancel: pointerUp, onKeyDown: keyDown };
    return { panel, style, handleProps };
}
