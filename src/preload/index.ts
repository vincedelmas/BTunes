import type {Rpc} from "../shared/types/rpc";
import {contextBridge, ipcRenderer, webUtils} from "electron";


const rpc: Rpc = (method, input) => ipcRenderer.invoke("rpc", method, input);


contextBridge.exposeInMainWorld("btunes", {
    rpc,
    filePaths: (files: File[]) => files.map((file) => webUtils.getPathForFile(file)).filter(Boolean),
});
