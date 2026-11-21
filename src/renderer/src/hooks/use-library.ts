import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "../../../shared/errors";
import {useStateRefresh} from "@/hooks/use-state-refresh";
import type {Snapshot} from "../../../shared/types/library";
import {useCallback, useEffect, useRef, useState} from "react";


export function useLibrary() {
    const [ready, setReady] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const [data, setData] = useState<Snapshot>({
        revision: 0,
        tracks: [],
        playlists: [],
        folders: [],
    });

    const revision = useRef<number | undefined>(undefined);
    const refreshing = useRef<Promise<void> | undefined>(undefined);

    // Keep the action callbacks stable for the uncompiled TrackTable.
    const refresh = useCallback(() => {
        if (refreshing.current) return refreshing.current;

        const request = rpc("library.get", revision.current === undefined ? undefined : { revision: revision.current })
            .then((snapshot) => {
                if (!snapshot) return;
                revision.current = snapshot.revision;
                setData(snapshot);
            })
            .finally(() => {
                refreshing.current = undefined;
                setReady(true);
            });

        refreshing.current = request;
        return request;
    }, []);

    async function reconcile() {
        setBusy(true);
        try {
            const result = await rpc("library.refresh", undefined);
            await refresh();
            setNotice(result.errors.length ? "Some music folders could not be refreshed. Check that they are available." : "Library refreshed.");
        }
        finally {
            setBusy(false);
        }
    }

    const reportError = useCallback((error: unknown) => setError(getErrorMessage(error)), []);

    useStateRefresh("library", async (isActive) => {
        // A manual refresh may have read the previous revision before this notification.
        await refreshing.current?.catch(() => undefined);
        if (isActive()) await refresh();
    }, reportError);

    useEffect(() => {
        if (!notice) return;

        const timer = setTimeout(() => setNotice(""), 4000);
        return () => clearTimeout(timer);
    }, [notice]);

    async function importFolder() {
        setBusy(true);
        setError("");

        try {
            const result = await rpc("library.import", undefined);
            if (!result) return;

            let message = result.imported + " songs indexed.";
            if (result.errors.length) message += " " + result.errors.length + " files skipped.";

            setNotice(message);
            await refresh();
        }
        catch (error) {
            reportError(error);
        }
        finally {
            setBusy(false);
        }
    }

    const updatePlaylist = useCallback(async (method: "playlist.add" | "playlist.remove", playlistId: number, trackIds: number[], message: string) => {
        try {
            await rpc(method, { playlistId, trackIds });
            setNotice(message);
            await refresh();
        }
        catch (error) {
            reportError(error);
        }
    }, [refresh, reportError]);

    const addToPlaylist = useCallback((playlistId: number, trackIds: number[]) => (
        updatePlaylist("playlist.add", playlistId, trackIds, "Songs added to playlist.")
    ), [updatePlaylist]);

    const removeFromPlaylist = useCallback((playlistId: number, trackIds: number[]) => (
        updatePlaylist("playlist.remove", playlistId, trackIds, "Songs removed from playlist.")
    ), [updatePlaylist]);

    return {
        ready,
        data,
        busy,
        error,
        notice,
        refresh,
        reconcile,
        setError,
        setNotice,
        reportError,
        importFolder,
        addToPlaylist,
        removeFromPlaylist,
    };
}
