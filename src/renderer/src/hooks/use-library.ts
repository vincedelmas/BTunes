import {useCallback, useEffect, useState} from "react";
import type {Snapshot, Track} from "../../../shared/contracts";
import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "@/lib/music";

export function useLibrary() {
    const [data, setData] = useState<Snapshot>({
        tracks: [],
        playlists: [],
        folders: [],
    });
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        const snapshot = await rpc("library.get", undefined);
        setData(snapshot);
    }, []);

    const reportError = useCallback(
        (error: unknown) => setError(getErrorMessage(error)),
        [],
    );

    useEffect(() => {
        void refresh().catch(reportError);
        const timer = setInterval(() => void refresh().catch(reportError), 5000);

        return () => clearInterval(timer);
    }, [refresh, reportError]);

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

    async function favorite(track: Track) {
        try {
            await rpc("track.favorite", { id: track.id });
            await refresh();
        }
        catch (error) {
            reportError(error);
        }
    }

    async function addToPlaylist(playlistId: number, trackId: number) {
        try {
            await rpc("playlist.add", { playlistId, trackId });
            setNotice("Song added to playlist.");
            await refresh();
        }
        catch (error) {
            reportError(error);
        }
    }

    return {
        data,
        error,
        notice,
        busy,
        setError,
        setNotice,
        refresh,
        reportError,
        importFolder,
        favorite,
        addToPlaylist,
    };
}
