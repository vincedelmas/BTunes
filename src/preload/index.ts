import { contextBridge, ipcRenderer } from 'electron'
import type { Rpc } from '../shared/contracts'
const rpc: Rpc = (method,input)=>ipcRenderer.invoke('rpc',method,input)
contextBridge.exposeInMainWorld('sillage',{rpc})
