const assert = require("node:assert/strict");
const {spawn} = require("node:child_process");
const {mkdtemp, readdir, readFile, rm} = require("node:fs/promises");
const {tmpdir} = require("node:os");
const {join, resolve} = require("node:path");
const {once} = require("node:events");
const {setTimeout: delay} = require("node:timers/promises");

async function main() {
    const artifacts = (await readdir("dist")).filter((name) => name.endsWith("-x86_64.AppImage"));
    assert.equal(artifacts.length, 1, "Build exactly one x64 AppImage before running this test");

    const appImage = resolve("dist", artifacts[0]);
    const profile = await mkdtemp(join(tmpdir(), "btunes-appimage-"));
    const environment = {...process.env, APPIMAGE_EXTRACT_AND_RUN: "1"};
    delete environment.ELECTRON_RUN_AS_NODE;
    delete environment.ELECTRON_RENDERER_URL;

    const child = spawn(appImage, [
        "--ozone-platform=headless",
        "--remote-debugging-address=127.0.0.1",
        "--remote-debugging-port=0",
        "--user-data-dir=" + profile,
    ], {env: environment, detached: true, stdio: ["ignore", "pipe", "pipe"]});

    let logs = "";
    let socket;
    let sequence = 0;
    const pending = new Map();
    const deadline = Date.now() + 45000;
    const appendLog = (chunk) => { logs = (logs + chunk.toString()).slice(-32000); };
    child.stdout.on("data", appendLog);
    child.stderr.on("data", appendLog);
    child.on("error", appendLog);

    async function waitFor(read) {
        while (Date.now() < deadline) {
            if (child.exitCode !== null || child.signalCode !== null) throw new Error("AppImage exited before the smoke test completed\n" + logs);
            const result = await read();
            if (result) return result;
            await delay(100);
        }
        throw new Error("AppImage smoke test timed out\n" + logs);
    }

    function send(method, params = {}) {
        const id = ++sequence;
        return new Promise((resolveRequest, reject) => {
            pending.set(id, {resolve: resolveRequest, reject});
            socket.send(JSON.stringify({id, method, params}));
        });
    }

    function terminate(signal) {
        if (child.pid === undefined) return;
        try { process.kill(-child.pid, signal); } catch {}
    }

    const watchdog = setTimeout(() => {
        for (const request of pending.values()) request.reject(new Error("AppImage debugger timed out"));
        terminate("SIGKILL");
    }, 45000);

    try {
        const port = await waitFor(() => logs.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//)?.[1]);
        const target = await waitFor(async () => {
            const response = await fetch("http://127.0.0.1:" + port + "/json/list", {signal: AbortSignal.timeout(3000)});
            const targets = await response.json();
            return targets.find((item) => item.type === "page" && item.url.startsWith("file:"));
        });

        socket = new WebSocket(target.webSocketDebuggerUrl);
        await once(socket, "open", {signal: AbortSignal.timeout(Math.max(1, deadline - Date.now()))});
        socket.addEventListener("message", (ev) => {
            const message = JSON.parse(ev.data);
            const request = pending.get(message.id);
            if (!request) return;
            pending.delete(message.id);
            if (message.error) request.reject(new Error(message.error.message));
            else request.resolve(message.result);
        });

        async function evaluate(expression) {
            const response = await send("Runtime.evaluate", {expression, awaitPromise: true, returnByValue: true});
            if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
            return response.result.value;
        }

        await waitFor(() => evaluate("Boolean(window.btunes && document.querySelector('h1'))"));
        const result = await evaluate(`(async () => {
            if (document.title !== 'BTunes') throw new Error('Packaged application did not load');
            const library = await window.btunes.rpc('library.get', undefined);
            if (library.tracks.length || library.folders.length) throw new Error('Smoke test must use an empty isolated profile');
            const updates = await window.btunes.rpc('updates.get', undefined);
            if (!updates.enabled) throw new Error('AppImage updates are disabled in the packaged application');
            [...document.querySelectorAll('button')].find(item => item.textContent.trim() === 'Settings').click();
            return {version: updates.version, tracks: library.tracks.length};
        })()`);
        await waitFor(() => evaluate("Boolean([...document.querySelectorAll('[role=tab]')].find(item => item.textContent.trim() === 'About'))"));
        await evaluate("[...document.querySelectorAll('[role=tab]')].find(item => item.textContent.trim() === 'About').click()");
        await waitFor(() => evaluate("Boolean([...document.querySelectorAll('button')].find(item => item.textContent.trim() === 'Check for updates' && !item.disabled))"));

        const packageJson = JSON.parse(await readFile("package.json", "utf8"));
        assert.equal(result.version, packageJson.version, "Packaged version must match package.json");
        const updateConfig = await readFile("dist/linux-unpacked/resources/app-update.yml", "utf8");
        assert.match(updateConfig, /owner: vincedelmas/);
        assert.match(updateConfig, /repo: BTunes/);
        assert.match(await readFile("dist/latest-linux.yml", "utf8"), /BTunes-.*-x86_64\.AppImage/);
        console.log("AppImage smoke passed", JSON.stringify(result));
    }
    finally {
        clearTimeout(watchdog);
        socket?.close();
        terminate("SIGTERM");
        await Promise.race([once(child, "exit").catch(() => undefined), delay(3000)]);
        terminate("SIGKILL");
        await rm(profile, {recursive: true, force: true});
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
