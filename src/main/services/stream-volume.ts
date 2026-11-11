import {promisify} from "node:util";
import {readFile} from "node:fs/promises";
import {execFile} from "node:child_process";


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
    private dirty = false;
    private revision = 0;
    private volume: number | undefined;
    private streams = new Set<number>();
    private timer: ReturnType<typeof setInterval> | undefined;
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
        this.timer = setInterval(() => void this.refresh(), 300);
        this.timer.unref();
    }

    close() {
        this.closed = true;
        clearInterval(this.timer);
    }

    setVolume(volume: number) {
        // A reloaded renderer needs the current output mode even when volume is unchanged.
        this.reported = undefined;
        if (this.volume === volume) return this.refresh();

        this.volume = volume;
        this.dirty = true;
        this.revision++;
        return this.refresh();
    }

    private report(native: boolean) {
        if (this.closed || this.volume === undefined) return;
        if (this.reported?.volume === this.volume && this.reported.native === native) return;

        this.reported = { native, volume: this.volume };
        this.notify(this.volume, native);
    }

    async refresh() {
        if (this.closed || this.busy || this.volume === undefined) return;

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
        }
    }
}
