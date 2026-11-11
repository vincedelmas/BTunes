import type {Rpc} from "../shared/types/rpc";
import type {MediaCommand} from "../shared/types/media";
import {contextBridge, ipcRenderer, webUtils} from "electron";


const rpc: Rpc = (method, input) => ipcRenderer.invoke("rpc", method, input);


contextBridge.exposeInMainWorld("btunes", {
    rpc,
    nativeMedia: process.platform === "linux",
    onMediaCommand: (listener: (command: MediaCommand) => void) => {
        const receive = (_ev: Electron.IpcRendererEvent, command: MediaCommand) => listener(command);
        ipcRenderer.on("media-command", receive);
        return () => ipcRenderer.removeListener("media-command", receive);
    },
    filePaths: (files: File[]) => files.map((file) => webUtils.getPathForFile(file)).filter(Boolean),
});
