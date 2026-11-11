import {dirname} from "node:path";
import {randomUUID} from "node:crypto";
import {getErrorMessage} from "../../shared/errors.ts";
import type {UpdateState} from "../../shared/types/updates.ts";
import {mkdir, readFile, rename, rm, writeFile} from "node:fs/promises";
import {persistedUpdateStateSchema} from "../../shared/schemas/updates.ts";

const day = 24 * 60 * 60 * 1000;

interface UpdateCheckResult {
    isUpdateAvailable: boolean;
    updateInfo: { version: string };
}

interface AppUpdateAdapter {
    autoDownload: boolean;
    allowDowngrade: boolean;
    allowPrerelease: boolean;
    autoInstallOnAppQuit: boolean;
    downloadUpdate: () => Promise<string[]>;
    checkForUpdates: () => Promise<UpdateCheckResult | null>;
    on(ev: "error", listener: (error: Error) => void): unknown;
    quitAndInstall: (isSilent: boolean, isForceRunAfter: boolean) => void;
    removeListener(ev: "error", listener: (error: Error) => void): unknown;
    on(ev: "download-progress", listener: (progress: { percent: number }) => void): unknown;
    removeListener(ev: "download-progress", listener: (progress: { percent: number }) => void): unknown;
}

interface AppUpdateOptions {
    version: string;
    enabled: boolean;
    stateFile: string;
    now?: () => number;
    adapter?: AppUpdateAdapter;
    beforeInstall: () => Promise<void>;
}

function isNewerStable(candidate: string, installed: string) {
    const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
    if (!stableVersion.test(candidate) || !stableVersion.test(installed)) return false;

    const available = candidate.split(".").map(BigInt);
    const current = installed.split(".").map(BigInt);

    for (let index = 0; index < available.length; index++) {
        if (available[index] !== current[index]) return available[index] > current[index];
    }

    return false;
}

export class AppUpdateService {
    private readonly options: AppUpdateOptions;
    private readonly state: UpdateState;
    private readonly ready: Promise<void>;
    private dismissedVersion?: string;
    private pending?: Promise<void>;
    private writes = Promise.resolve();
    private startupTimer?: ReturnType<typeof setTimeout>;
    private periodicTimer?: ReturnType<typeof setInterval>;
    private manualRequested = false;
    private installing = false;
    private installError?: Error;
    private closed = false;

    constructor(options: AppUpdateOptions) {
        this.options = options;
        this.state = { version: options.version, enabled: options.enabled, status: "idle", showPrompt: false };

        if (options.enabled && !options.adapter) throw new Error("An updater is required for AppImage updates.");

        if (options.adapter) {
            options.adapter.autoDownload = false;
            options.adapter.autoInstallOnAppQuit = false;
            options.adapter.allowPrerelease = false;
            options.adapter.allowDowngrade = false;
            options.adapter.on("download-progress", this.progress);
            options.adapter.on("error", this.adapterError);
        }

        this.ready = this.load();
    }

    get() {
        return structuredClone(this.state);
    }

    start() {
        if (!this.state.enabled || this.closed || this.startupTimer || this.periodicTimer) return;

        this.startupTimer = setTimeout(() => {
            this.startupTimer = undefined;
            void this.check(false);
        }, 2500);
        this.periodicTimer = setInterval(() => void this.check(false), 60 * 60 * 1000);
        this.startupTimer.unref();
        this.periodicTimer.unref();
    }

    check(manual = true): Promise<void> {
        if (!this.state.enabled || this.closed || this.installing) return Promise.resolve();
        if (this.state.status === "downloading" || this.state.status === "downloaded") {
            if (manual) this.state.showPrompt = true;
            return Promise.resolve();
        }
        if (this.pending) {
            this.manualRequested ||= manual;
            return this.pending;
        }

        this.manualRequested = manual;
        this.pending = this.runCheck().finally(() => {
            this.pending = undefined;
        });
        return this.pending;
    }

    download(): Promise<void> {
        if (!this.state.enabled || this.closed || this.installing) return Promise.resolve();
        if (this.pending) return this.pending;
        if (!this.state.availableVersion || this.state.status === "downloaded") return Promise.resolve();

        this.pending = this.runDownload().finally(() => {
            this.pending = undefined;
        });
        return this.pending;
    }

    async install() {
        if (!this.state.enabled || this.closed || this.state.status !== "downloaded") {
            throw new Error("Download an update before installing it.");
        }
        if (this.installing) return;

        this.installing = true;
        this.installError = undefined;
        this.state.error = undefined;

        try {
            await this.options.beforeInstall();
            this.options.adapter?.quitAndInstall(false, true);
            if (this.installError) throw this.installError;
        }
        catch (error) {
            this.state.error = getErrorMessage(error);
            this.state.showPrompt = true;
            this.installing = false;
            throw error;
        }
    }

    async dismiss() {
        await this.ready;
        this.state.showPrompt = false;
        this.dismissedVersion = this.state.availableVersion;
        await this.save();
    }

    close() {
        this.closed = true;
        clearTimeout(this.startupTimer);
        clearInterval(this.periodicTimer);

        const removeListeners = () => {
            this.options.adapter?.removeListener("download-progress", this.progress);
            this.options.adapter?.removeListener("error", this.adapterError);
        };

        // Keep the error handler until active network work settles; EventEmitter errors must stay handled.
        if (this.pending) void this.pending.then(removeListeners, removeListeners);
        else removeListeners();
    }

    private readonly progress = ({ percent }: { percent: number }) => {
        if (!this.closed && this.state.status === "downloading" && Number.isFinite(percent)) {
            this.state.progress = Math.max(0, Math.min(100, percent));
        }
    };

    private readonly adapterError = (error: Error) => {
        if (this.installing) this.installError = error;
        if (this.closed || this.pending) return;

        this.state.error = getErrorMessage(error);
        if (this.state.status !== "downloaded") this.state.status = "error";
    };

    private async runCheck() {
        await this.ready;
        if (this.closed) return;

        const now = this.options.now?.() ?? Date.now();
        const lastCheckedAt = this.state.lastCheckedAt;
        if (!this.manualRequested && lastCheckedAt !== undefined && now >= lastCheckedAt && now - lastCheckedAt < day) return;

        this.state.status = "checking";
        this.state.error = undefined;

        try {
            const result = await this.options.adapter?.checkForUpdates();
            if (this.closed) return;
            if (!result) throw new Error("Update checks are unavailable for this installation.");

            const available = result.isUpdateAvailable && isNewerStable(result.updateInfo.version, this.state.version);
            this.state.availableVersion = available ? result.updateInfo.version : undefined;
            this.state.status = available ? "available" : "up-to-date";
            this.state.progress = undefined;
            this.state.showPrompt = Boolean(available && (this.manualRequested || this.dismissedVersion !== result.updateInfo.version));
            this.state.lastCheckedAt = now;
            await this.save();
        }
        catch (error) {
            if (this.closed) return;

            this.state.status = "error";
            this.state.error = getErrorMessage(error);
            this.state.showPrompt = this.manualRequested && Boolean(this.state.availableVersion);
        }
    }

    private async runDownload() {
        // Yield before calling the adapter so synchronous error events see the pending operation.
        await Promise.resolve();
        if (this.closed) return;

        this.state.status = "downloading";
        this.state.progress = 0;
        this.state.error = undefined;
        this.state.showPrompt = true;

        try {
            const files = await this.options.adapter?.downloadUpdate();
            if (this.closed) return;
            if (!files?.length) throw new Error("The update download did not produce an installable file.");

            // electron-updater resolves only after verifying the artifact against its release checksum.
            this.state.status = "downloaded";
            this.state.progress = 100;
        }
        catch (error) {
            if (this.closed) return;

            this.state.status = "error";
            this.state.error = getErrorMessage(error);
            this.state.progress = undefined;
        }
    }

    private async load() {
        try {
            const saved = persistedUpdateStateSchema.parse(JSON.parse(await readFile(this.options.stateFile, "utf8")));
            this.state.lastCheckedAt = saved.lastCheckedAt;
            this.dismissedVersion = saved.dismissedVersion;
        }
        catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.warn("Could not read update preferences:", getErrorMessage(error));
        }
    }

    private save() {
        const saved = { lastCheckedAt: this.state.lastCheckedAt, dismissedVersion: this.dismissedVersion };
        const temporary = this.options.stateFile + "." + randomUUID() + ".tmp";

        this.writes = this.writes.then(async () => {
            try {
                await mkdir(dirname(this.options.stateFile), { recursive: true });
                await writeFile(temporary, JSON.stringify(saved), { mode: 0o600 });
                await rename(temporary, this.options.stateFile);
            }
            catch (error) {
                console.warn("Could not save update preferences:", getErrorMessage(error));
            }
            finally {
                await rm(temporary, { force: true }).catch(() => undefined);
            }
        });

        return this.writes;
    }
}
