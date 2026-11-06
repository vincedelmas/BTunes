import {spawn} from "node:child_process";

export function downloadProcess(command: string, args: string[], signal: AbortSignal, onLine?: (line: string) => void) {
    return new Promise<void>((resolve, reject) => {
        signal.throwIfAborted();
        const child = spawn(command, args, { detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
        let output = "";
        let pending = "";
        let killTimer: ReturnType<typeof setTimeout> | undefined;
        const terminate = (force = false) => {
            if (!child.pid) return;
            try {
                if (process.platform === "win32") child.kill(force ? "SIGKILL" : "SIGTERM");
                else process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM");
            }
            catch { /* The process may have exited between the check and signal. */
            }
        };
        const abort = () => {
            terminate();
            killTimer = setTimeout(() => terminate(true), 3000);
            killTimer.unref();
        };
        signal.addEventListener("abort", abort, { once: true });
        child.stderr.on("data", (chunk: Buffer) => {
            output = (output + chunk.toString()).slice(-16000);
        });
        child.stdout.on("data", (chunk: Buffer) => {
            pending += chunk.toString();
            const lines = pending.split(/[\r\n]+/);
            pending = lines.pop()?.slice(-16000) ?? "";
            for (const line of lines) onLine?.(line);
        });
        const cleanup = () => {
            signal.removeEventListener("abort", abort);
            if (killTimer) clearTimeout(killTimer);
        };
        child.once("error", (error) => {
            cleanup();
            reject(error);
        });
        child.once("close", (code) => {
            cleanup();
            if (signal.aborted) reject(new Error("Download cancelled."));
            else if (code !== 0) reject(new Error(output.trim() || "Download tool exited with code " + code));
            else resolve();
        });
        if (signal.aborted) abort();
    });
}
