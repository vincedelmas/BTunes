import {useEffect, useEffectEvent, useRef} from "react";
import type {RefObject} from "react";


export function usePlaybackFollow(
    container: RefObject<HTMLElement | null>,
    trackId: number | undefined,
    playing: boolean,
    blocked: boolean,
    onFollow: (id: number) => void,
) {
    const lastInteraction = useRef(-Infinity);

    useEffect(() => {
        const element = container.current;
        if (!element) return;

        const interact = () => {
            lastInteraction.current = performance.now();
        };
        const events = ["pointerdown", "wheel", "keydown", "input"];
        events.forEach((name) => element.addEventListener(name, interact, { capture: true, passive: true }));

        return () => events.forEach((name) => element.removeEventListener(name, interact, true));
    }, [container]);

    const follow = useEffectEvent(() => {
        if (!trackId || blocked || performance.now() - lastInteraction.current < 8000) return;
        if (document.querySelector('[data-slot="dialog-content"], [role="menu"]')) return;
        if (document.activeElement?.matches("input:not([type=range]), textarea, [contenteditable=true]")) return;

        onFollow(trackId);
    });

    // Follow track changes and playback starts; never jump later when an interaction ends.
    useEffect(() => {
        if (playing) follow();
    }, [trackId, playing]);
}
