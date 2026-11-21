import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "../../../shared/errors";
import {useStateRefresh} from "@/hooks/use-state-refresh";
import {useEffect, useEffectEvent, useRef, useState} from "react";
import type {DeviceFile, DeviceSyncState, MusicDevice} from "../../../shared/types/devices";

export function useDevices() {
    const [devices, setDevices] = useState<MusicDevice[]>([]);
    const [storageId, setStorageId] = useState("");
    const [playlistIds, setPlaylistIds] = useState<number[]>([]);
    const [comparedPlaylists, setComparedPlaylists] = useState("");
    const [path, setPath] = useState("/");
    const [files, setFiles] = useState<DeviceFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [opening, setOpening] = useState(false);
    const [error, setError] = useState("");
    const [discoveryError, setDiscoveryError] = useState("");
    const [state, setState] = useState<DeviceSyncState>({ phase: "idle", completed: 0, total: 0, current: "", errors: [] });
    const listing = useRef(false);
    const browsing = useRef(0);
    const busy = state.phase === "comparing" || state.phase === "syncing";

    async function refresh() {
        if (listing.current) return;
        listing.current = true;
        setLoading(true);
        try {
            setDevices(await rpc("devices.list", undefined));
            setDiscoveryError("");
        }
        catch (error) {
            setDiscoveryError(getErrorMessage(error));
        }
        finally {
            listing.current = false;
            setLoading(false);
        }
    }

    const refreshDevices = useEffectEvent(() => {
        if (!busy && !document.hidden) void refresh();
    });

    useEffect(() => {
        if (busy) return;

        const initial = setTimeout(() => refreshDevices(), 0);
        const timer = setInterval(() => refreshDevices(), 15000);
        const onVisible = () => refreshDevices();
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearTimeout(initial);
            clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [busy]);

    useStateRefresh("devices", async (isActive) => {
        const next = await rpc("devices.status", undefined);
        if (isActive()) setState(next);
    }, (error) => setError(getErrorMessage(error)));

    async function browse(nextPath: string, nextStorage = storageId) {
        const request = ++browsing.current;
        setOpening(true);
        setError("");
        try {
            const entries = await rpc("devices.browse", { storageId: nextStorage, path: nextPath });
            if (request !== browsing.current) return;
            setStorageId(nextStorage);
            setPath(nextPath);
            setFiles(entries);
        }
        catch (error) {
            if (request === browsing.current) setError(getErrorMessage(error));
        }
        finally {
            if (request === browsing.current) setOpening(false);
        }
    }

    async function updateSync(operation: () => Promise<void>) {
        setError("");
        try {
            await operation();
        }
        catch (error) {
            setError(getErrorMessage(error));
        }
    }

    function togglePlaylist(id: number, checked: boolean) {
        setPlaylistIds((current) => {
            if (!checked) return current.filter((item) => item !== id);
            if (current.includes(id)) return current;

            return [...current, id];
        });
    }

    function compare() {
        setComparedPlaylists(JSON.stringify(playlistIds));
        return updateSync(() => rpc("devices.compare", { storageId, path, playlistIds }));
    }

    function sync() {
        return updateSync(() => rpc("devices.sync", undefined));
    }

    async function createMusicFolder() {
        try {
            await rpc("devices.mkdir", { storageId, path: "/Music" });
            await browse("/Music");
        }
        catch (error) {
            setError(getErrorMessage(error));
        }
    }

    function cancel() {
        return updateSync(() => rpc("devices.cancel", undefined));
    }

    return {
        devices, storageId, path, files, loading, opening, error: error || discoveryError, state, busy,
        refresh, browse, compare, sync, createMusicFolder, cancel,
        playlistIds, togglePlaylist, selectionCompared: comparedPlaylists === JSON.stringify(playlistIds),
    };
}
