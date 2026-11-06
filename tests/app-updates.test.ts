import assert from "node:assert/strict";
import {test} from "node:test";
import {EventEmitter} from "node:events";
import {mkdtemp, readFile, readdir, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {AppUpdateService} from "../src/main/services/app-updates.ts";

const day = 24 * 60 * 60 * 1000;

class FakeUpdater extends EventEmitter {
    autoDownload = true;
    autoInstallOnAppQuit = true;
    allowPrerelease = true;
    allowDowngrade = true;
    checks = 0;
    downloads = 0;
    installs: [boolean, boolean][] = [];
    available = true;
    availableVersion = "1.1.0";
    checkError?: Error;
    downloadError?: Error;
    installError?: Error;
    checkPending?: Promise<void>;
    downloadPending?: Promise<void>;

    async checkForUpdates() {
        this.checks++;
        await this.checkPending;
        if (this.checkError) {
            this.emit("error", this.checkError);
            throw this.checkError;
        }

        return { isUpdateAvailable: this.available, updateInfo: { version: this.availableVersion } };
    }

    async downloadUpdate() {
        this.downloads++;
        await this.downloadPending;
        if (this.downloadError) {
            this.emit("error", this.downloadError);
            throw this.downloadError;
        }

        return ["/verified-update.AppImage"];
    }

    quitAndInstall(isSilent: boolean, isForceRunAfter: boolean) {
        this.installs.push([isSilent, isForceRunAfter]);
        if (this.installError) this.emit("error", this.installError);
    }
}

async function fixture() {
    const root = await mkdtemp(join(tmpdir(), "btunes-app-updates-"));
    const updater = new FakeUpdater();
    let now = day * 10;
    let prepareCalls = 0;
    const options = {
        adapter: updater,
        version: "1.0.0",
        enabled: true,
        stateFile: join(root, "updates.json"),
        beforeInstall: async () => {
            prepareCalls++;
        },
        now: () => now,
    };
    const service = new AppUpdateService(options);

    return {
        root, updater, options, service,
        get prepareCalls() {
            return prepareCalls;
        },
        advance: (milliseconds: number) => {
            now += milliseconds;
        },
        close: async () => {
            service.close();
            await rm(root, { recursive: true, force: true });
        },
    };
}

void test("app updates persist daily checks and dismissed versions while manual checks can show them again", async () => {
    const setup = await fixture();
    const {service, updater, options} = setup;

    try {
        assert.equal(updater.autoDownload, false);
        assert.equal(updater.autoInstallOnAppQuit, false);
        assert.equal(updater.allowPrerelease, false);
        assert.equal(updater.allowDowngrade, false);

        await service.check(false);
        assert.equal(service.get().status, "available");
        assert.equal(service.get().showPrompt, true);
        assert.equal(updater.downloads, 0);
        await service.dismiss();
        assert.equal(service.get().showPrompt, false);

        const saved = JSON.parse(await readFile(options.stateFile, "utf8"));
        assert.equal(saved.dismissedVersion, "1.1.0");
        assert.equal(saved.lastCheckedAt, day * 10);
        assert.deepEqual(await readdir(setup.root), ["updates.json"]);

        service.close();
        const restarted = new AppUpdateService(options);
        try {
            await restarted.check(false);
            assert.equal(updater.checks, 1);
            setup.advance(day);
            await restarted.check(false);
            assert.equal(updater.checks, 2);
            assert.equal(restarted.get().availableVersion, "1.1.0");
            assert.equal(restarted.get().showPrompt, false);

            await restarted.check();
            assert.equal(updater.checks, 3);
            assert.equal(restarted.get().showPrompt, true);
            updater.availableVersion = "1.2.0";
            setup.advance(day);
            await restarted.check(false);
            assert.equal(restarted.get().showPrompt, true);
        }
        finally {
            restarted.close();
        }
    }
    finally {
        await setup.close();
    }
});

void test("app updates accept only newer stable versions and never downgrade", async () => {
    const setup = await fixture();

    try {
        for (const version of ["1.0.0", "0.9.0", "1.1.0-beta.1", "invalid"]) {
            setup.updater.availableVersion = version;
            await setup.service.check();
            assert.equal(setup.service.get().status, "up-to-date", version);
            assert.equal(setup.service.get().availableVersion, undefined);
            assert.equal(setup.service.get().showPrompt, false);
        }

        setup.updater.availableVersion = "1.10.0";
        await setup.service.check();
        assert.equal(setup.service.get().availableVersion, "1.10.0");
        setup.updater.available = false;
        await setup.service.check();
        assert.equal(setup.service.get().status, "up-to-date");
    }
    finally {
        await setup.close();
    }
});

void test("failed checks stay retryable and do not consume the daily check allowance", async () => {
    const setup = await fixture();

    try {
        setup.updater.checkError = new Error("Offline");
        await setup.service.check(false);
        assert.equal(setup.service.get().status, "error");
        assert.equal(setup.service.get().showPrompt, false);
        assert.equal(setup.service.get().lastCheckedAt, undefined);

        await setup.service.check();
        assert.equal(setup.service.get().showPrompt, false);
        assert.equal(setup.service.get().availableVersion, undefined);

        setup.updater.checkError = undefined;
        await setup.service.check(false);
        assert.equal(setup.updater.checks, 3);
        assert.equal(setup.service.get().status, "available");
    }
    finally {
        await setup.close();
    }
});

void test("download verification failures cannot install and successful retries preserve the ready update", async () => {
    const setup = await fixture();
    const {service, updater} = setup;

    try {
        await assert.rejects(service.install(), /Download an update/);
        await service.check();
        updater.downloadError = new Error("SHA512 checksum mismatch");
        await service.download();
        assert.equal(service.get().status, "error");
        assert.match(service.get().error ?? "", /checksum/);
        await assert.rejects(service.install(), /Download an update/);
        assert.equal(updater.installs.length, 0);
        assert.equal(setup.prepareCalls, 0);

        updater.downloadError = undefined;
        await service.download();
        assert.equal(service.get().status, "downloaded");
        assert.equal(service.get().progress, 100);
        await service.check();
        assert.equal(service.get().status, "downloaded");
        assert.equal(updater.checks, 1);
        assert.equal(updater.installs.length, 0);
        await service.install();
        await service.install();
        assert.equal(setup.prepareCalls, 1);
        assert.deepEqual(updater.installs, [[false, true]]);
    }
    finally {
        await setup.close();
    }
});

void test("concurrent checks and downloads share work and installation drains jobs once", async () => {
    const setup = await fixture();
    let completeCheck!: () => void;
    let completeDownload!: () => void;
    let completePreparation!: () => void;
    setup.updater.checkPending = new Promise<void>((resolve) => {
        completeCheck = resolve;
    });
    setup.updater.downloadPending = new Promise<void>((resolve) => {
        completeDownload = resolve;
    });

    try {
        const automatic = setup.service.check(false);
        const manual = setup.service.check();
        assert.equal(automatic, manual);
        completeCheck();
        await automatic;
        assert.equal(setup.updater.checks, 1);
        assert.equal(setup.service.get().showPrompt, true);

        const first = setup.service.download();
        const duplicate = setup.service.download();
        assert.equal(first, duplicate);
        await Promise.resolve();
        setup.updater.emit("download-progress", { percent: 42 });
        assert.equal(setup.service.get().progress, 42);
        setup.updater.emit("download-progress", { percent: Number.NaN });
        assert.equal(setup.service.get().progress, 42);
        await setup.service.check();
        assert.equal(setup.updater.checks, 1);
        completeDownload();
        await first;
        assert.equal(setup.updater.downloads, 1);

        setup.options.beforeInstall = () => new Promise<void>((resolve) => {
            completePreparation = resolve;
        });
        const install = setup.service.install();
        await setup.service.install();
        assert.equal(setup.updater.installs.length, 0);
        completePreparation();
        await install;
        assert.equal(setup.updater.installs.length, 1);
    }
    finally {
        completeCheck();
        completeDownload();
        await setup.close();
    }
});

void test("installation reports synchronous updater failures without discarding the downloaded file", async () => {
    const setup = await fixture();

    try {
        await setup.service.check();
        await setup.service.download();
        setup.updater.installError = new Error("AppImage is not writable");
        await assert.rejects(setup.service.install(), /not writable/);
        assert.equal(setup.service.get().status, "downloaded");
        assert.equal(setup.service.get().showPrompt, true);
        assert.match(setup.service.get().error ?? "", /not writable/);

        setup.updater.installError = undefined;
        await setup.service.install();
        assert.equal(setup.updater.installs.length, 2);
        assert.equal(setup.service.get().error, undefined);
    }
    finally {
        await setup.close();
    }
});

void test("unreadable preferences and persistence failures do not prevent verified downloads", async () => {
    const setup = await fixture();
    setup.service.close();
    const stateFile = join(setup.root, "blocked", "updates.json");
    await writeFile(join(setup.root, "blocked"), "not a directory");
    const service = new AppUpdateService({ ...setup.options, stateFile });

    try {
        await service.check();
        assert.equal(service.get().status, "available");
        await service.dismiss();
        await service.download();
        assert.equal(service.get().status, "downloaded");
        assert.equal(service.get().error, undefined);
    }
    finally {
        service.close();
        await setup.close();
    }
});

void test("development installs remain offline and closing stops scheduled checks", async (context) => {
    const setup = await fixture();
    setup.service.close();
    context.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
    const disabled = new AppUpdateService({ ...setup.options, enabled: false });
    const enabled = new AppUpdateService(setup.options);

    try {
        disabled.start();
        await disabled.check();
        await disabled.download();
        context.mock.timers.tick(3000);
        assert.equal(setup.updater.checks, 0);

        enabled.start();
        context.mock.timers.tick(2499);
        assert.equal(setup.updater.checks, 0);
        enabled.close();
        context.mock.timers.tick(day * 2);
        assert.equal(setup.updater.checks, 0);
    }
    finally {
        disabled.close();
        enabled.close();
        context.mock.timers.reset();
        await setup.close();
    }
});
