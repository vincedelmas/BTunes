import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "@/lib/music";
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

        await rpc("library.import", undefined)
            .then(async (result) => {
                if (!result) return;

                let message = result.imported + " songs indexed.";
                if (result.errors.length) message += " " + result.errors.length + " files skipped.";

                setNotice(message);
                await refresh();
            })
            .catch(reportError)
            .finally(() => setBusy(false));
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
        ready,
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
