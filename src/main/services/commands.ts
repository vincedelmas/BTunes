import {execFile} from "node:child_process";
import {promisify} from "node:util";
import type {CommandRunner} from "../types/devices.ts";

const execute = promisify(execFile);

export const runCommand: CommandRunner = async (command, args, timeout = 30000) => {
    try {
        const result = await execute(command, args, {
            timeout, maxBuffer: 16 * 1024 * 1024,
            env: { ...process.env, LC_ALL: "C", QT_QPA_PLATFORM: "offscreen" },
        });
        return result.stdout;
    }
    catch (error) {
        const failure = error as NodeJS.ErrnoException & { stderr?: string; killed?: boolean };
        if (failure.code === "ENOENT") throw new Error(command + " is required. Install kio-extras and systemd for USB/MTP support.");
        if (failure.killed) throw new Error("The phone stopped responding. Check the USB connection and try again.");
        throw new Error(failure.stderr?.trim() || "Unable to communicate with the phone.", { cause: error });
    }
};
