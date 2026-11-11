import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "../../../shared/errors";
import {useEffect, useEffectEvent, useRef, useState} from "react";
import type {DeviceFile, DeviceSyncState, MusicDevice} from "../../../shared/types/devices";

export function useDevices() {
    const [devices, setDevices] = useState<MusicDevice[]>([]);
    const [storageId, setStorageId] = useState("");
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
        if (!busy) void refresh();
    });

    useEffect(() => {
        const initial = setTimeout(refreshDevices, 0);
        const timer = setInterval(refreshDevices, 5000);
        return () => {
            clearTimeout(initial);
            clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        let active = true;
        let pending = false;

        async function poll() {
            if (pending) return;
            pending = true;
            try {
                const next = await rpc("devices.status", undefined);
                if (active) setState(next);
            }
            catch (error) {
                if (active) setError(getErrorMessage(error));
            }
            finally {
                pending = false;
            }
        }

        void poll();
        const timer = setInterval(() => void poll(), 750);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, []);

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
            setState(await rpc("devices.status", undefined));
        }
        catch (error) {
            setError(getErrorMessage(error));
        }
    }

    function compare() {
        return updateSync(() => rpc("devices.compare", { storageId, path }));
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
    };
}
