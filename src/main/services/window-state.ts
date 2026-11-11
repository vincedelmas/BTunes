import {dirname} from "node:path";
import type {BrowserWindow, Rectangle} from "electron";
import {windowStateSchema} from "../../shared/schemas/window-state.ts";
import {mkdirSync, readFileSync, renameSync, writeFileSync} from "node:fs";


export function readWindowState(path: string, workAreas: Rectangle[]) {
    try {
        const state = windowStateSchema.parse(JSON.parse(readFileSync(path, "utf8")));
        const area = workAreas.find((area) => (
            state.x < area.x + area.width && state.x + state.width > area.x
            && state.y < area.y + area.height && state.y + state.height > area.y
        )) ?? workAreas[0];

        if (!area) return undefined;

        const width = Math.max(1000, Math.min(state.width, area.width));
        const height = Math.max(700, Math.min(state.height, area.height));

        return {
            ...state,
            width,
            height,
            x: Math.max(area.x, Math.min(state.x, area.x + area.width - width)),
            y: Math.max(area.y, Math.min(state.y, area.y + area.height - height)),
        };
    }
    catch {
        return undefined;
    }
}


export function saveWindowState(path: string, win: Pick<BrowserWindow, "getNormalBounds" | "isMaximized" | "isFullScreen">) {
    try {
        const state = windowStateSchema.parse({
            ...win.getNormalBounds(),
            maximized: win.isMaximized(),
            fullscreen: win.isFullScreen(),
        });

        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(`${path}.tmp`, JSON.stringify(state), { mode: 0o600 });
        renameSync(`${path}.tmp`, path);
    }
    catch (error) {
        console.error("Could not save window state:", error);
    }
}
