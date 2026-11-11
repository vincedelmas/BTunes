import {test} from "node:test";
import {tmpdir} from "node:os";
import {join} from "node:path";
import assert from "node:assert/strict";
import {mkdtempSync, rmSync, writeFileSync} from "node:fs";
import {readWindowState, saveWindowState} from "../src/main/services/window-state.ts";


void test("window state persists normal bounds and fullscreen/maximized modes", () => {
    const directory = mkdtempSync(join(tmpdir(), "btunes-window-"));
    const path = join(directory, "profile", "window-state.json");
    const area = { x: 0, y: 0, width: 1920, height: 1080 };
    const bounds = { x: 120, y: 80, width: 1200, height: 800 };

    try {
        assert.equal(readWindowState(path, [area]), undefined);

        for (const maximized of [false, true]) {
            for (const fullscreen of [false, true]) {
                saveWindowState(path, {
                    getNormalBounds: () => bounds,
                    isMaximized: () => maximized,
                    isFullScreen: () => fullscreen,
                });
                assert.deepEqual(readWindowState(path, [area]), { ...bounds, maximized, fullscreen });
            }
        }

        assert.deepEqual(readWindowState(path, [{ ...area, x: -1920 }]), {
            ...bounds, x: -1200, maximized: true, fullscreen: true,
        });
        assert.deepEqual(readWindowState(path, [{ ...area, width: 1100, height: 750 }]), {
            x: 0, y: 0, width: 1100, height: 750, maximized: true, fullscreen: true,
        });

        writeFileSync(path, "invalid JSON");
        assert.equal(readWindowState(path, [area]), undefined);
        writeFileSync(path, JSON.stringify({ ...bounds, width: -1, maximized: false, fullscreen: false }));
        assert.equal(readWindowState(path, [area]), undefined);
    }
    finally {
        rmSync(directory, { force: true, recursive: true });
    }
});
