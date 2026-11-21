import {rpc} from "@/lib/rpc";
import {useEffect, useRef, useState} from "react";
import {getErrorMessage} from "../../../shared/errors";
import {useStateRefresh} from "@/hooks/use-state-refresh";
import type {DownloadSnapshot} from "../../../shared/types/downloads";

export function useDownloads() {
    const [snapshot, setSnapshot] = useState<DownloadSnapshot>();
    const [error, setError] = useState("");
    const [deleting, setDeleting] = useState<string[]>([]);
    const revision = useRef<number | undefined>(undefined);

    function apply(data: DownloadSnapshot | null) {
        if (!data || data.revision <= (revision.current ?? -1)) return;
        revision.current = data.revision;
        setSnapshot(data);
    }

    useStateRefresh("downloads", async (isActive) => {
        const data = await rpc("downloads.get", { revision: revision.current });
        if (isActive()) apply(data);
    }, (error) => setError(getErrorMessage(error)));

    useEffect(() => {
        let active = true;
        void rpc("downloads.enter", undefined).catch((error: unknown) => {
            if (active) setError(getErrorMessage(error));
        });
        return () => {
            active = false;
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

    async function discard(id: string) {
        setDeleting((previous) => [...previous, id]);
        try {
            await run(async () => {
                await rpc("downloads.discard", { id });
                apply(await rpc("downloads.get", {}));
            });
        }
        finally {
            setDeleting((previous) => previous.filter((value) => value !== id));
        }
    }

    return {
        snapshot, error, deleting, discard,
        refresh: () => run(() => rpc("downloads.enter", undefined)),
        updateTools: () => run(() => rpc("downloads.tools", undefined)),
        start: (ids: string[]) => run(() => rpc("downloads.start", { ids })),
        cancel: () => run(() => rpc("downloads.cancel", undefined)),
    };
}
