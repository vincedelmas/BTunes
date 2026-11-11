import {test} from "node:test";
import assert from "node:assert/strict";
import {StreamVolumeService} from "../src/main/services/stream-volume.ts";


function fixture() {
    const writes: string[][] = [];
    const notifications: { volume: number; native: boolean }[] = [];
    let inputs = [stream(1, 10), stream(2, 20)];
    const service = new StreamVolumeService(
        (volume, native) => notifications.push({ volume, native }),
        async (args) => {
            if (args[0] === "-f") return JSON.stringify(inputs);
            writes.push(args);
            const input = inputs.find((item) => item.index === Number(args[1]));
            if (input && args[0] === "set-sink-input-volume") {
                input.volume.mono.value = Math.round(Number(args[2].replace("%", "")) / 100 * 65536);
            }
            return "";
        },
        async (pid) => pid === 10,
    );
    return { service, writes, notifications, replace: (value: typeof inputs) => { inputs = value; } };
}


function stream(index: number, pid: number, volume = 1, mute = false) {
    return {
        mute,
        index,
        volume: { mono: { value: volume * 65536 } },
        properties: { "application.process.id": String(pid) },
    };
}


void test("app volume controls only its own stream and desktop changes return to the app", async () => {
    const state = fixture();
    await state.service.setVolume(0.4);
    assert.deepEqual(state.writes, [["set-sink-input-volume", "1", "40%"]]);
    assert.deepEqual(state.notifications, [{ volume: 0.4, native: true }]);
    state.replace([stream(1, 10, 0.25), stream(2, 20)]);
    await state.service.refresh();
    assert.deepEqual(state.notifications.at(-1), { volume: 0.25, native: true });
    assert.equal(state.writes.length, 1, "Reading a desktop change must not apply volume a second time");
    await state.service.setVolume(0.8);
    assert.deepEqual(state.writes.at(-1), ["set-sink-input-volume", "1", "80%"]);
    state.service.close();
});


void test("volume survives stream recreation and falls back when no stream is present", async () => {
    const state = fixture();
    await state.service.setVolume(0.3);
    state.replace([]);
    await state.service.refresh();
    assert.deepEqual(state.notifications.at(-1), { volume: 0.3, native: false });
    state.replace([stream(9, 10)]);
    await state.service.refresh();
    assert.deepEqual(state.writes.at(-1), ["set-sink-input-volume", "9", "30%"]);
    assert.deepEqual(state.notifications.at(-1), { volume: 0.3, native: true });
    state.service.close();
});


void test("desktop mute reaches the app and raising volume unmutes its stream", async () => {
    const state = fixture();
    await state.service.setVolume(0.3);
    state.replace([stream(1, 10, 0.3, true)]);
    await state.service.refresh();
    assert.deepEqual(state.notifications.at(-1), { volume: 0, native: true });
    await state.service.setVolume(0.2);
    assert.deepEqual(state.writes.slice(-2), [
        ["set-sink-input-volume", "1", "20%"],
        ["set-sink-input-mute", "1", "0"],
    ]);
    state.service.close();
});


void test("missing pactl preserves internal volume and closed services stop notifying", async () => {
    const notifications: boolean[] = [];
    const service = new StreamVolumeService(
        (_volume, native) => notifications.push(native),
        async () => { throw new Error("pactl unavailable"); },
    );
    await service.setVolume(0.5);
    assert.deepEqual(notifications, [false]);
    service.close();
    await service.setVolume(0.2);
    assert.deepEqual(notifications, [false]);
});


void test("a reopened renderer receives the active stream mode even when volume is unchanged", async () => {
    const state = fixture();
    await state.service.setVolume(0.4);
    state.notifications.length = 0;
    await state.service.setVolume(0.4);
    assert.deepEqual(state.notifications, [{ volume: 0.4, native: true }]);
    state.service.close();
});
