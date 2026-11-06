import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "@/lib/music";
import type {Snapshot} from "../../../shared/types/library";
import {useCallback, useEffect, useRef, useState} from "react";


export function useLibrary() {
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
            });

        refreshing.current = request;
        return request;
    }, []);

    const reportError = useCallback((error: unknown) => setError(getErrorMessage(error)), []);

    useEffect(() => {
        void refresh().catch(reportError);
        const timer = setInterval(() => void refresh().catch(reportError), 5000);

        return () => clearInterval(timer);
    }, [refresh, reportError]);

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

            if (result) {
                let message = result.imported + " songs indexed.";
                if (result.errors.length)
                    message += " " + result.errors.length + " files skipped.";

                setNotice(message);
                await refresh();
            }
        }
        catch (error) {
            reportError(error);
        }
        finally {
            setBusy(false);
        }
    }

    async function addToPlaylist(playlistId: number, trackIds: number[]) {
        try {
            await rpc("playlist.add", { playlistId, trackIds });
            setNotice("Songs added to playlist.");
            await refresh();
        }
        catch (error) {
            reportError(error);
        }
    }

    async function removeFromPlaylist(playlistId: number, trackIds: number[]) {
        try {
            await rpc("playlist.remove", { playlistId, trackIds });
            setNotice("Songs removed from playlist.");
            await refresh();
        }
        catch (error) {
            reportError(error);
        }
    }

    return {
        data,
        busy,
        error,
        notice,
        refresh,
        setError,
        setNotice,
        reportError,
        importFolder,
        addToPlaylist,
        removeFromPlaylist,
    };
}
