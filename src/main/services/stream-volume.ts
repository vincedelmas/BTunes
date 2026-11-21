import {promisify} from "node:util";
import {readFile} from "node:fs/promises";
import {createInterface} from "node:readline";
import {execFile, spawn} from "node:child_process";


const execute = promisify(execFile);
const runPactl = async (args: string[]) => {
    const result = await execute("pactl", args, { timeout: 3000, maxBuffer: 1024 * 1024 });
    return result.stdout;
};


interface AudioStream {
    mute: boolean;
    index: number;
    volume: Record<string, { value: number }>;
    properties: Record<string, string>;
}


async function ownsProcess(pid: number) {
    for (let depth = 0; depth < 40 && pid > 1; depth++) {
        if (pid === process.pid) return true;

        try {
            const status = await readFile(`/proc/${pid}/status`, "utf8");
            pid = Number(status.match(/^PPid:\s+(\d+)/m)?.[1]);
        }
        catch {
            return false;
        }
    }

    return false;
}


export class StreamVolumeService {
    private busy = false;
    private closed = false;
    private playing = false;
    private refreshAgain = false;
    private subscription?: ReturnType<typeof spawn>;
    private retry?: ReturnType<typeof setTimeout>;
    private eventTimer?: ReturnType<typeof setTimeout>;
    private fallback?: ReturnType<typeof setInterval>;
    private dirty = false;
    private revision = 0;
    private volume: number | undefined;
    private streams = new Set<number>();
    private reported: { volume: number; native: boolean } | undefined;

    private readonly run: typeof runPactl;
    private readonly owns: typeof ownsProcess;
    private readonly notify: (volume: number, native: boolean) => void;

    constructor(
        notify: (volume: number, native: boolean) => void,
        run = runPactl,
        owns = ownsProcess,
    ) {
        this.run = run;
        this.owns = owns;
        this.notify = notify;
    }

    start() {
        if (this.closed || this.subscription || this.retry) return;

        const subscription = spawn("pactl", ["subscribe"], {
            env: { ...process.env, LC_ALL: "C" },
            stdio: ["ignore", "pipe", "ignore"],
        });
        this.subscription = subscription;
        const lines = createInterface({ input: subscription.stdout });
        lines.on("line", (line) => {
            clearInterval(this.fallback);
            this.fallback = undefined;
            const change = /^Event '(new|change|remove)' on sink-input #(\d+)$/.exec(line);
            if (!change || this.eventTimer || this.closed) return;
            if (change[1] !== "new" && !this.streams.has(Number(change[2]))) return;

            this.eventTimer = setTimeout(() => {
                this.eventTimer = undefined;
                void this.refresh();
            }, 50);
            this.eventTimer.unref();
        });
        subscription.on("spawn", () => {
            void this.refresh();
        });
        subscription.on("error", () => {
            // The close handler handles both missing pactl and a lost audio server.
        });
        subscription.once("close", () => {
            this.subscription = undefined;
            if (this.closed) return;

            this.streams.clear();
            void this.refresh();

            if (!this.fallback) {
                this.fallback = setInterval(() => {
                    if (this.playing) void this.refresh();
                }, 2000);
                this.fallback.unref();
            }

            this.retry = setTimeout(() => {
                this.retry = undefined;
                this.start();
            }, 30000);
            this.retry.unref();
        });
    }

    close() {
        this.closed = true;
        clearTimeout(this.retry);
        clearTimeout(this.eventTimer);
        clearInterval(this.fallback);
        this.subscription?.kill();
    }

    async setVolume(volume: number, playing = this.playing, replayMode = false) {
        if (this.closed) return;

        const playingChanged = this.playing !== playing;
        this.playing = playing;
        if (this.volume === volume) {
            // Replay the known mode when a new renderer subscribes.
            if (replayMode && this.reported) this.notify(this.reported.volume, this.reported.native);
            if (playingChanged) await this.refresh();
            return;
        }

        this.volume = volume;
        this.dirty = true;
        this.revision++;
        await this.refresh();
    }

    private report(native: boolean) {
        if (this.closed || this.volume === undefined) return;
        if (this.reported?.volume === this.volume && this.reported.native === native) return;

        this.reported = { native, volume: this.volume };
        this.notify(this.volume, native);
    }

    async refresh() {
        if (this.closed || this.volume === undefined) return;
        if (this.busy) {
            this.refreshAgain = true;
            return;
        }

        this.busy = true;
        const revision = this.revision;

        try {
            const inputs: AudioStream[] = JSON.parse(await this.run(["-f", "json", "list", "sink-inputs"]));
            const streams: AudioStream[] = [];

            for (const input of inputs) {
                const pid = Number(input.properties["application.process.id"]);
                if (!Number.isSafeInteger(pid) || !Number.isSafeInteger(input.index)) continue;
                if (await this.owns(pid)) streams.push(input);
            }

            if (this.closed || revision !== this.revision) return;

            if (!streams.length) {
                this.streams.clear();
                this.report(false);
                return;
            }

            const added = streams.some((stream) => !this.streams.has(stream.index));
            if (this.dirty || added) {
                const volume = this.volume;
                // PulseAudio volume is cubic; the player preference is linear signal gain.
                const streamVolume = Math.round(Math.cbrt(volume) * 65536);
                for (const stream of streams) {
                    await this.run(["set-sink-input-volume", String(stream.index), String(streamVolume)]);
                    if (stream.mute && volume > 0) {
                        await this.run(["set-sink-input-mute", String(stream.index), "0"]);
                    }
                }
                if (this.closed || revision !== this.revision) return;

                this.dirty = false;
            }
            else {
                const stream = streams[0];
                const channels = Object.values(stream.volume);
                if (!channels.length) return;

                const streamVolume = Math.max(...channels.map((channel) => channel.value)) / 65536;
                const observed = stream.mute ? 0 : streamVolume ** 3;
                this.volume = Math.max(0, Math.min(1, Math.round(observed * 100) / 100));
            }

            this.streams = new Set(streams.map((stream) => stream.index));
            this.report(true);
        }
        catch {
            // Keep HTML audio volume working when pactl or an audio server is unavailable.
            this.streams.clear();
            this.report(false);
        }
        finally {
            this.busy = false;
            if (this.refreshAgain) {
                this.refreshAgain = false;
                await this.refresh();
            }
        }
    }
}
