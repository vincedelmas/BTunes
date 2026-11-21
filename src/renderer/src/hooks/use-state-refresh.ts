import {useEffect, useEffectEvent} from "react";
import type {StateTopic} from "../../../shared/types/rpc";


export function useStateRefresh(topic: StateTopic, refresh: (isActive: () => boolean) => Promise<void>, onError: (error: unknown) => void) {
    const load = useEffectEvent(refresh);
    const reportError = useEffectEvent(onError);

    useEffect(() => {
        let active = true;
        let pending = false;
        let requested = false;

        async function request() {
            requested = true;
            if (pending) return;

            pending = true;
            try {
                while (active && requested) {
                    requested = false;
                    try {
                        await load(() => active);
                    }
                    catch (error) {
                        if (active) reportError(error);
                    }
                }
            }
            finally {
                pending = false;
            }
        }

        const unsubscribe = window.btunes.onStateChanged((topics) => {
            if (topics.includes(topic)) void request();
        });
        const refreshOnFocus = () => void request();
        window.addEventListener("focus", refreshOnFocus);
        void request();

        return () => {
            active = false;
            unsubscribe();
            window.removeEventListener("focus", refreshOnFocus);
        };
    }, [topic]);
}
