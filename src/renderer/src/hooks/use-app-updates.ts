import {rpc} from "@/lib/rpc";
import {useEffect, useRef, useState} from "react";
import {getErrorMessage} from "../../../shared/errors";
import type {AppUpdateController} from "@/types/updates";
import {useStateRefresh} from "@/hooks/use-state-refresh";
import type {UpdateState} from "../../../shared/types/updates";

export function useAppUpdates(): AppUpdateController {
    const [state, setState] = useState<UpdateState>();
    const [pending, setPending] = useState(false);
    const [connectionError, setConnectionError] = useState("");
    const [operationError, setOperationError] = useState("");
    const running = useRef(false);
    const mounted = useRef(false);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useStateRefresh("updates", async (isActive) => {
        const snapshot = await rpc("updates.get", undefined);
        if (!isActive()) return;

        setState(snapshot);
        setConnectionError("");
    }, (error) => setConnectionError(getErrorMessage(error)));

    async function run(method: "updates.check" | "updates.download" | "updates.install") {
        if (running.current) return;

        running.current = true;
        setPending(true);
        setOperationError("");

        try {
            await rpc(method, undefined);
        }
        catch (error) {
            if (mounted.current) setOperationError(getErrorMessage(error));
        }
        finally {
            running.current = false;
            if (mounted.current) setPending(false);
        }
    }

    async function dismiss() {
        setOperationError("");
        try {
            await rpc("updates.dismiss", undefined);
        }
        catch (error) {
            if (mounted.current) setOperationError(getErrorMessage(error));
        }
    }

    return {
        state,
        pending,
        error: operationError || connectionError,
        check: () => run("updates.check"),
        download: () => run("updates.download"),
        install: () => run("updates.install"),
        dismiss,
    };
}
