import {rpc} from "@/lib/rpc";
import {useEffect, useRef, useState} from "react";
import {getErrorMessage} from "../../../shared/errors";
import type {AppUpdateController} from "@/types/updates";
import type {UpdateState} from "../../../shared/types/updates";

export function useAppUpdates(): AppUpdateController {
    const [state, setState] = useState<UpdateState>();
    const [pending, setPending] = useState(false);
    const [connectionError, setConnectionError] = useState("");
    const [operationError, setOperationError] = useState("");
    const running = useRef(false);
    const mounted = useRef(false);
    const lastSnapshot = useRef("");

    useEffect(() => {
        let active = true;
        let timer: ReturnType<typeof setTimeout>;
        mounted.current = true;

        async function poll() {
            try {
                const snapshot = await rpc("updates.get", undefined);
                if (active) {
                    const serialized = JSON.stringify(snapshot);
                    if (serialized !== lastSnapshot.current) {
                        lastSnapshot.current = serialized;
                        setState(snapshot);
                    }
                    setConnectionError("");
                }
            }
            catch (error) {
                if (active) setConnectionError(getErrorMessage(error));
            }
            finally {
                if (active) timer = setTimeout(() => void poll(), 1000);
            }
        }

        void poll();
        return () => {
            active = false;
            mounted.current = false;
            clearTimeout(timer);
        };
    }, []);

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
