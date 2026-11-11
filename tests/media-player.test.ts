import {test} from "node:test";
import {strict as assert} from "node:assert";
import {spawnSync} from "node:child_process";
import {mediaStateSchema} from "../src/shared/schemas/media.ts";


void test("media state validates volume before it reaches desktop controls", () => {
    const state = { volume: 0.4, active: true, playing: false, canGoNext: false, canGoPrevious: false };
    assert.equal(mediaStateSchema.parse(state).volume, 0.4);
    for (const volume of [-1, 2, NaN, Infinity]) {
        assert.equal(mediaStateSchema.safeParse({ ...state, volume }).success, false);
    }
});


void test("desktop volume and playback commands travel through an isolated D-Bus session", () => {
    const result = spawnSync("dbus-run-session", [process.execPath, "--experimental-strip-types", "--input-type=module", "-e", `
        import dbus from "dbus-next";
        import {strict as assert} from "node:assert";
        import {startMediaPlayer} from "./src/main/services/media-player.ts";

        const {default: Module} = await import("node:module");
        const load = Module._load;
        Module._load = function (name, ...args) {
            assert.notEqual(name, "usocket", "MPRIS must use Node's built-in Unix sockets");
            return load.call(this, name, ...args);
        };
        const commands = [];
        const service = await startMediaPlayer((command) => commands.push(command));
        const client = dbus.sessionBus();
        try {
            const object = await client.getProxyObject(
                "org.mpris.MediaPlayer2.btunes.instance" + process.pid,
                "/org/mpris/MediaPlayer2",
            );
            const properties = object.getInterface("org.freedesktop.DBus.Properties");
            const player = object.getInterface("org.mpris.MediaPlayer2.Player");
            const iface = "org.mpris.MediaPlayer2.Player";
            service.player.update({
                volume: 0.35, active: true, playing: true, canGoNext: true, canGoPrevious: false,
                track: { id: 1, title: "Track", album: "Album", artist: "Artist" },
            });
            assert.equal((await properties.Get(iface, "Volume")).value, 0.35);
            assert.equal((await properties.Get(iface, "PlaybackStatus")).value, "Playing");
            assert.equal((await properties.Get(iface, "Metadata")).value["xesam:title"].value, "Track");
            await properties.Set(iface, "Volume", new dbus.Variant("d", 0.6));
            assert.deepEqual(commands.shift(), { action: "volume", volume: 0.6 });
            assert.equal((await properties.Get(iface, "Volume")).value, 0.6);
            await properties.Set(iface, "Volume", new dbus.Variant("d", 2));
            assert.deepEqual(commands.shift(), { action: "volume", volume: 1 });
            for (const [method, action] of [
                ["Play", "play"], ["Pause", "pause"], ["Stop", "stop"],
                ["Next", "next"], ["Previous", "previous"], ["PlayPause", "toggle"],
            ]) {
                await player[method]();
                assert.deepEqual(commands.shift(), { action });
            }
            service.player.update({ volume: 0.6, active: false, playing: false, canGoNext: false, canGoPrevious: false });
            assert.equal((await properties.Get(iface, "PlaybackStatus")).value, "Stopped");
            assert.deepEqual((await properties.Get(iface, "Metadata")).value, {});
            assert.equal(commands.length, 0);
        }
        finally {
            client.disconnect();
            service.close();
        }
    `], { encoding: "utf8", timeout: 15000 });

    assert.equal(result.status, 0, result.stderr || String(result.error));
});
