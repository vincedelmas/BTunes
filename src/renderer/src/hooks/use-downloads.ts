import {useEffect, useRef, useState} from "react";
import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "../../../shared/errors";
import type {DownloadSnapshot} from "../../../shared/types/downloads";

export function useDownloads() {
    const [snapshot, setSnapshot] = useState<DownloadSnapshot>();
    const [error, setError] = useState("");
    const revision = useRef<number | undefined>(undefined);

    useEffect(() => {
        let active = true;
        let pending = false;

        async function poll() {
            if (pending) return;
            pending = true;
            try {
                const data = await rpc("downloads.get", { revision: revision.current });
                if (active && data) {
                    revision.current = data.revision;
                    setSnapshot(data);
                }
            }
            catch (error) {
                if (active) setError(getErrorMessage(error));
            }
            finally {
                pending = false;
            }
        }

        void rpc("downloads.enter", undefined).then(poll).catch((error: unknown) => {
            if (active) setError(getErrorMessage(error));
        });
        const timer = setInterval(() => void poll(), 500);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, []);

    async function run(operation: () => Promise<unknown>) {
        setError("");
        try {
            await operation();
        }
        catch (error) {
            setError(getErrorMessage(error));
        }
    }

    return {
        snapshot, error,
        refresh: () => run(() => rpc("downloads.enter", undefined)),
        updateTools: () => run(() => rpc("downloads.tools", undefined)),
        start: (ids: string[]) => run(() => rpc("downloads.start", { ids })),
        cancel: () => run(() => rpc("downloads.cancel", undefined)),
    };
}
