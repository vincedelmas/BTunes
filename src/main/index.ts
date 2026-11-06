import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'
import { LibraryRepository } from './repositories/library'
import { LibraryService } from './services/library'
protocol.registerSchemesAsPrivileged([{scheme:'sillage',privileges:{standard:true,secure:true,stream:true,supportFetchAPI:true}}])
let service: LibraryService
let quitting=false
app.whenReady().then(async()=>{
 const repo=new LibraryRepository(join(app.getPath('userData'),'library.sqlite'))
 service=new LibraryService(repo,join(app.getPath('userData'),'covers'))
 const id=z.object({id:z.number().int().positive()})
 const routes = {
  'library.get': { schema:z.undefined(), run:()=>repo.snapshot() },
  'library.import': { schema:z.undefined(), run:async()=>{ const result=await dialog.showOpenDialog({properties:['openDirectory'],title:'Choisir un dossier musical'}); return result.canceled ? null : service.scan(result.filePaths[0]) } },
  'track.favorite':{schema:id,run:(x:{id:number})=>repo.favorite(x.id)},
  'track.played':{schema:id,run:(x:{id:number})=>repo.played(x.id)},
  'playlist.create':{schema:z.object({name:z.string().trim().min(1).max(100),rule:z.string().trim().min(1).max(100).optional()}),run:(x:{name:string;rule?:string})=>repo.create(x.name,x.rule)},
  'playlist.add':{schema:z.object({playlistId:z.number().int().positive(),trackId:z.number().int().positive()}),run:(x:{playlistId:number;trackId:number})=>repo.add(x.playlistId,x.trackId)},
  'playlist.tracks':{schema:id,run:(x:{id:number})=>repo.playlist(x.id)}
 }
 const win=new BrowserWindow({width:1440,height:940,minWidth:1000,minHeight:700,backgroundColor:'#111411',title:'Sillage',webPreferences:{preload:join(__dirname,'../preload/index.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}})
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}))
 win.webContents.on('will-navigate',e=>e.preventDefault())
 ipcMain.handle('rpc',async(event,method:unknown,input:unknown)=>{
  if(event.sender!==win.webContents || event.senderFrame!==win.webContents.mainFrame) throw new Error('Accès refusé')
  if(typeof method!=='string' || !Object.hasOwn(routes,method)) throw new Error('Méthode inconnue')
  const route=routes[method as keyof typeof routes]
  return (route.run as (x:unknown)=>unknown)(route.schema.parse(input))
 })
 protocol.handle('sillage',request=>{
  const u=new URL(request.url)
  if(u.hostname==='audio') {
   const track=repo.get(Number(u.pathname.slice(1)))
   if(track) return net.fetch(pathToFileURL(track.path).href,{headers:request.headers})
  }
  if(u.hostname==='cover' && /^[a-f0-9]{64}$/.test(u.pathname.slice(1))) return net.fetch(pathToFileURL(join(service.covers,u.pathname.slice(1))).href)
  return new Response('Introuvable',{status:404})
 })
 await service.startWatching()
 if(process.env.ELECTRON_RENDERER_URL) await win.loadURL(process.env.ELECTRON_RENDERER_URL)
 else await win.loadFile(join(__dirname,'../renderer/index.html'))
})
app.on('window-all-closed',()=>app.quit())
app.on('before-quit',e=>{if(service && !quitting){ e.preventDefault(); quitting=true; void service.close().finally(()=>app.quit()) }})
