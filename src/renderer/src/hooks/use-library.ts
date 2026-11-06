import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "../../../shared/errors";
import type {Snapshot} from "../../../shared/types/library";
import {useEffect, useEffectEvent, useRef, useState} from "react";


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

    const refresh = () => {
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
    };

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

    const reportError = (error: unknown) => setError(getErrorMessage(error));

    const pollLibrary = useEffectEvent(() => {
        void refresh().catch(reportError);
    });

    useEffect(() => {
        pollLibrary();
        const timer = setInterval(() => pollLibrary(), 5000);

        return () => clearInterval(timer);
    }, []);

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

    async function updatePlaylist(method: "playlist.add" | "playlist.remove", playlistId: number, trackIds: number[], message: string) {
        try {
            await rpc(method, { playlistId, trackIds });
            setNotice(message);
            await refresh();
        }
        catch (error) {
            reportError(error);
        }
    }

    function addToPlaylist(playlistId: number, trackIds: number[]) {
        return updatePlaylist("playlist.add", playlistId, trackIds, "Songs added to playlist.");
    }

    function removeFromPlaylist(playlistId: number, trackIds: number[]) {
        return updatePlaylist("playlist.remove", playlistId, trackIds, "Songs removed from playlist.");
    }

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
