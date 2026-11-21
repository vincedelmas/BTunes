import type {MediaCommand} from "../shared/types/media";
import type {Rpc, StateTopic} from "../shared/types/rpc";
import {contextBridge, ipcRenderer, webUtils} from "electron";


const rpc: Rpc = (method, input) => ipcRenderer.invoke("rpc", method, input);


function subscribe<T>(channel: "media-command" | "state-changed", listener: (payload: T) => void) {
    const receive = (_ev: Electron.IpcRendererEvent, payload: T) => listener(payload);
    ipcRenderer.on(channel, receive);

    return () => {
        ipcRenderer.removeListener(channel, receive);
    };
}


contextBridge.exposeInMainWorld("btunes", {
    rpc,
    nativeMedia: process.platform === "linux",
    filePaths: (files: File[]) => files.map((file) => webUtils.getPathForFile(file)).filter(Boolean),
    onMediaCommand: (listener: (command: MediaCommand) => void) => subscribe("media-command", listener),
    onStateChanged: (listener: (topics: StateTopic[]) => void) => subscribe("state-changed", listener),
});
