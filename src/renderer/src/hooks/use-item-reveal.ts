import {useRef, useState} from "react";
import type {ItemReveal} from "@/types/reveal";

export function useItemReveal() {
    const sequence = useRef(0);
    const [target, setTarget] = useState<ItemReveal>();

    function show(key: string | number, select = true) {
        setTarget({ key, request: ++sequence.current, select });
    }

    function clear() {
        setTarget(undefined);
    }

    return { target, show, clear };
}
