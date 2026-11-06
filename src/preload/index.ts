import type {Rpc} from "../shared/types/rpc";
import {contextBridge, ipcRenderer} from "electron";


const rpc: Rpc = (method, input) => ipcRenderer.invoke("rpc", method, input);
contextBridge.exposeInMainWorld("btunes", { rpc });
