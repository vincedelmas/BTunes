import {mkdir, readFile, writeFile, rename, chmod, rm, access} from "node:fs/promises";
import {join} from "node:path";
import {createHash, randomUUID} from "node:crypto";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {releaseSchema, toolManifestSchema} from "../../shared/schemas/downloads.ts";
import type {ToolStatus} from "../../shared/types/downloads.ts";
import {getErrorMessage} from "../../shared/errors.ts";

const execute = promisify(execFile);
const specifications = [
    { key: "yt-dlp", repo: "yt-dlp/yt-dlp", binaries: { "yt-dlp_linux": "yt-dlp" } },
    {
        key: "ffmpeg",
        repo: "eugeneware/ffmpeg-static",
        binaries: { "ffmpeg-linux-x64": "ffmpeg", "ffprobe-linux-x64": "ffprobe", "linux-x64.LICENSE": "LICENSE.txt", "linux-x64.README": "SOURCE.txt" }
    },
];

export class DownloadTools {
    private readonly root: string;
    private readonly changed: () => void;
    private pending?: Promise<void>;
    private controller = new AbortController();
    private versions: Record<string, string> = {};
    private status: ToolStatus = { checking: false, ready: false, message: "Tools have not been checked yet.", versions: {} };

    constructor(root: string, changed: () => void) {
        this.root = root;
        this.changed = changed;
    }

    snapshot() {
        return structuredClone(this.status);
    }

    ffmpeg() {
        return this.status.ready ? this.path("ffmpeg") : "ffmpeg";
    }

    private async load() {
        try {
            this.versions = toolManifestSchema.parse(JSON.parse(await readFile(join(this.root, "versions.json"), "utf8")));
        }
        catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
        const paths = [this.path("yt-dlp"), this.path("ffmpeg"), this.path("ffmpeg", "ffprobe")];
        this.status.ready = (await Promise.all(paths.map((path) => access(path).then(() => true, () => false)))).every(Boolean);
        this.status.versions = { ...this.versions };
    }

    path(key: string, binary = key) {
        return join(this.root, key, this.versions[key] ?? "missing", binary);
    }

    check() {
        if (this.pending) return this.pending;
        this.controller = new AbortController();
        this.status.checking = true;
        this.status.message = "Checking download tools…";
        this.changed();
        this.pending = this.update().catch((error: unknown) => {
            this.status.message = getErrorMessage(error);
        }).finally(() => {
            this.status.checking = false;
            this.pending = undefined;
            this.changed();
        });
        return this.pending;
    }

    private async update() {
        await mkdir(this.root, { recursive: true });
        await this.load();
        this.changed();
        if (process.platform !== "linux" || process.arch !== "x64") throw new Error("Managed downloader tools currently support Linux x64.");
        for (const spec of specifications) {
            const response = await fetch("https://api.github.com/repos/" + spec.repo + "/releases/latest", {
                headers: { "User-Agent": "BTunes/0.1 (github.com/vincedelmas/BTunes)" }, signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(20000)]),
            });
            if (!response.ok) throw new Error("Cannot check " + spec.key + " updates (" + response.status + "). Installed tools are kept.");
            const release = releaseSchema.parse(await response.json());
            if (this.versions[spec.key] === release.tag_name && this.status.ready) continue;
            this.status.message = "Installing " + spec.key + " " + release.tag_name + "…";
            this.changed();
            const parent = join(this.root, spec.key);
            await mkdir(parent, { recursive: true });
            const staging = join(parent, ".pending-" + randomUUID());
            await mkdir(staging);
            try {
                for (const [name, binary] of Object.entries(spec.binaries)) {
                    const asset = release.assets.find((asset) => asset.name === name);
                    if (!asset || asset.size > 250 * 1024 * 1024) throw new Error("Download tool asset is missing or too large: " + name);
                    const url = new URL(asset.browser_download_url);
                    if (url.protocol !== "https:" || url.hostname !== "github.com" || !url.pathname.startsWith("/" + spec.repo + "/releases/download/")) throw new Error("Invalid download tool source.");
                    const result = await fetch(url, { signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(180000)]) });
                    if (!result.ok || !result.body) throw new Error("Could not download " + name);
                    const chunks: Buffer[] = [];
                    let size = 0;
                    for await (const chunk of result.body) {
                        size += chunk.length;
                        if (size > asset.size || size > 250 * 1024 * 1024) throw new Error("Tool download exceeded its advertised size.");
                        chunks.push(Buffer.from(chunk));
                    }
                    const data = Buffer.concat(chunks);
                    if (size !== asset.size) throw new Error("Incomplete download: " + name);
                    if (asset.digest?.startsWith("sha256:") && createHash("sha256").update(data).digest("hex") !== asset.digest.slice(7)) throw new Error("Download tool checksum mismatch.");
                    await writeFile(join(staging, binary), data);
                    if (!binary.endsWith(".txt")) await chmod(join(staging, binary), 0o755);
                }
                await execute(join(staging, spec.key), [spec.key === "yt-dlp" ? "--version" : "-version"], { timeout: 15000 });
                const target = join(parent, release.tag_name);
                // Versions are immutable: running jobs keep their original binaries during updates.
                await rename(staging, target).catch(async (error: NodeJS.ErrnoException) => {
                    if (error.code !== "EEXIST" && error.code !== "ENOTEMPTY") throw error;
                    await access(join(target, spec.key));
                });
                this.versions[spec.key] = release.tag_name;
                const manifest = join(this.root, ".versions-" + randomUUID());
                await writeFile(manifest, JSON.stringify(this.versions));
                await rename(manifest, join(this.root, "versions.json"));
            }
            finally {
                await rm(staging, { recursive: true, force: true });
            }
        }
        await this.load();
        this.status.message = "Download tools are up to date.";
    }

    async acquire() {
        if (!this.status.ready) await this.check();
        if (!this.status.ready) throw new Error(this.status.message);
        return { ytDlp: this.path("yt-dlp"), ffmpeg: this.path("ffmpeg"), ffprobe: this.path("ffmpeg", "ffprobe") };
    }

    async close() {
        this.controller.abort();
        await this.pending;
    }
}
