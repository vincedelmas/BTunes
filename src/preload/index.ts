import type {Rpc} from "../shared/contracts";
import {contextBridge, ipcRenderer} from "electron";


const rpc: Rpc = (method, input) => ipcRenderer.invoke("rpc", method, input);
contextBridge.exposeInMainWorld("btunes", { rpc });
