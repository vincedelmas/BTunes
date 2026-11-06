const { app, dialog } = require('electron')
const { mkdtempSync, rmSync, writeFileSync, mkdirSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const profile = mkdtempSync(join(tmpdir(),'sillage-smoke-'))
app.setPath('userData',profile)
const music=join(profile,'music');mkdirSync(music)
const wav=Buffer.alloc(44+16000)
wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8)
wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22)
wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34)
wav.write('data',36);wav.writeUInt32LE(16000,40);writeFileSync(join(music,'Silence.wav'),wav)
dialog.showOpenDialog=async()=>({canceled:false,filePaths:[music]})
let done=false
const finish=(code)=>{if(done)return;done=true;try{rmSync(profile,{recursive:true,force:true})}catch{}app.exit(code)}
setTimeout(()=>{console.error('Smoke test timed out');finish(1)},20000)
app.on('browser-window-created',(_,win)=>{
 win.hide()

 win.webContents.on('did-finish-load',async()=>{
  try {
   const result=await win.webContents.executeJavaScript(`(async()=>{
    const library=await window.sillage.rpc('library.get',undefined);
    if(library.tracks.length!==0) throw new Error('Unexpected tracks');
    const imported=await window.sillage.rpc('library.import',undefined);
    if(imported.imported!==1 || imported.errors.length)throw new Error('Import failed');
    const indexed=await window.sillage.rpc('library.get',undefined);
    const audio=document.querySelector('audio');
    await new Promise((resolve,reject)=>{
     const timeout=setTimeout(()=>reject(new Error('Audio metadata timeout')),5000);
     audio.onloadedmetadata=()=>{clearTimeout(timeout);resolve()};
     audio.onerror=()=>{clearTimeout(timeout);reject(new Error('Audio protocol failed'))};
     audio.src='sillage://audio/'+indexed.tracks[0].id;audio.load();
    });
    if(Math.abs(audio.duration-1)>.01) throw new Error('Invalid audio duration');
    const id=await window.sillage.rpc('playlist.create',{name:'Smoke'});
    const next=await window.sillage.rpc('library.get',undefined);
    if(!next.playlists.some(p=>p.id===id)) throw new Error('RPC persistence failed');
    let rejected=false;try{await window.sillage.rpc('track.favorite',{id:-1})}catch{rejected=true}
    if(!rejected)throw new Error('Invalid input accepted');
    return {heading:document.querySelector('h1')?.textContent,playlist:next.playlists.length};
   })()`)
   if(!result.heading?.includes('Vos albums')) throw new Error('React failed to render')
   console.log('Electron smoke passed',JSON.stringify(result));finish(0)
  }catch(e){console.error(e);finish(1)}
 })
})
require('../out/main/index.js')
