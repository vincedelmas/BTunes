const {app, dialog} = require("electron");
const {mkdtempSync, rmSync, writeFileSync, mkdirSync} = require("node:fs");
const {tmpdir} = require("node:os");
const {join} = require("node:path");
const {execFileSync} = require("node:child_process");
const profile = mkdtempSync(join(tmpdir(), "btunes-smoke-"));
app.setPath("userData", profile);
const music = join(profile, "music");
mkdirSync(music);
const wav = Buffer.alloc(44 + 16000 * 60);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24);
wav.writeUInt32LE(16000, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(16000 * 60, 40);
writeFileSync(join(profile, "Silence.wav"), wav);
execFileSync("ffmpeg", [
    "-v",
    "error",
    "-i",
    join(profile, "Silence.wav"),
    "-metadata",
    "title=Silence",
    join(music, "Silence.mp3"),
]);
dialog.showOpenDialog = async () => ({canceled: false, filePaths: [music]});
let done = false;
const finish = (code) => {
    if (done) return;
    done = true;
    try {
        rmSync(profile, {recursive: true, force: true});
    } catch {
    }
    app.exit(code);
};
setTimeout(() => {
    console.error("Smoke test timed out");
    finish(1);
}, 20000);
app.on("browser-window-created", (_, win) => {
    win.hide();

    win.webContents.on("did-finish-load", async () => {
        try {
            const result = await win.webContents.executeJavaScript(`(async()=>{
    if(document.title!=='BTunes') throw new Error('Incorrect application title');
    if(document.querySelector('.brand span')?.textContent!=='BTunes') throw new Error('Incorrect application branding');
    const library=await window.btunes.rpc('library.get',undefined);
    if(library.tracks.length!==0) throw new Error('Unexpected tracks');
    const imported=await window.btunes.rpc('library.import',undefined);
    if(imported.imported!==1 || imported.errors.length)throw new Error('Import failed');
    const indexed=await window.btunes.rpc('library.get',undefined);
    const audio=document.querySelector('audio');
    await new Promise((resolve,reject)=>{
     const timeout=setTimeout(()=>reject(new Error('Audio metadata timeout')),5000);
     audio.onloadedmetadata=()=>{clearTimeout(timeout);resolve()};
     audio.onerror=()=>{clearTimeout(timeout);reject(new Error('Audio protocol failed'))};
     audio.src='btunes://audio/'+indexed.tracks[0].id;audio.load();
    });
    if(Math.abs(audio.duration-60)>.3) throw new Error('Invalid audio duration');
    const id=await window.btunes.rpc('playlist.create',{name:'Smoke'});
    const next=await window.btunes.rpc('library.get',undefined);
    if(!next.playlists.some(p=>p.id===id)) throw new Error('RPC persistence failed');
    let rejected=false;try{await window.btunes.rpc('track.favorite',{id:-1})}catch{rejected=true}
    if(!rejected)throw new Error('Invalid input accepted');

    const waitFor=async(predicate)=>{
     const end=Date.now()+5000;
     while(!predicate()){if(Date.now()>end)throw new Error('UI condition timed out');await new Promise(resolve=>setTimeout(resolve,25))}
    };
    const findButton=(text)=>[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===text);
    if(document.querySelector('h1')?.textContent!=='Songs') throw new Error('Songs must open by default');
    findButton('Settings').click();
    await waitFor(()=>document.querySelector('button[aria-label="Refresh library"]'));
    document.querySelector('button[aria-label="Refresh library"]').click();
    await waitFor(()=>document.querySelector('.library-stat strong')?.textContent==='1');
    findButton('Back to music').click();
    await waitFor(()=>document.querySelector('button[aria-label="Edit tags for Silence"]'));
    document.querySelector('button[aria-label="Play Silence"]').click();
    await waitFor(()=>!document.querySelector('input[aria-label="Playback position"]').disabled);
    const seekInput=document.querySelector('input[aria-label="Playback position"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(seekInput,'37');
    seekInput.dispatchEvent(new Event('input',{bubbles:true}));
    await waitFor(()=>audio.currentTime>=36.5);
    await new Promise(resolve=>setTimeout(resolve,350));
    if(audio.currentTime<36.5 || audio.currentTime>40)throw new Error('Seeking jumped back or lost its position');
    audio.pause();
        document.querySelector('button[aria-label="Edit tags for Silence"]').click();
    await waitFor(()=>document.getElementById('tag-title'));
    const titleInput=document.getElementById('tag-title');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(titleInput,'Edited through UI');
    titleInput.dispatchEvent(new Event('input',{bubbles:true}));
    await waitFor(()=>!findButton('Preview changes').disabled);
    findButton('Preview changes').click();
    await waitFor(()=>findButton('Save to files'));
    if(!document.querySelector('[aria-label="Tag change preview"]').textContent.includes('Edited through UI'))throw new Error('Preview missing edit');
    findButton('Save to files').click();
    await waitFor(()=>!document.querySelector('[role="dialog"]'));
    const saved=await window.btunes.rpc('library.get',undefined);
    if(saved.tracks[0].title!=='Edited through UI')throw new Error('UI tag save failed');
    if(!audio.paused)throw new Error('Tag editing or a library refresh resumed paused playback');
    if(document.querySelector('[role="status"]')?.textContent.trim()!=='Tags saved.')throw new Error('Save notice should be concise');
    const font=getComputedStyle(document.body).fontFamily;
    if(!font.includes('Inter Variable'))throw new Error('Bundled font not applied');
    return {heading:document.querySelector('h1')?.textContent,playlist:next.playlists.length,title:saved.tracks[0].title};

   })()`);
            if (!result.heading?.includes("Songs"))
                throw new Error("React failed to render");
            console.log("Electron smoke passed", JSON.stringify(result));
            finish(0);
        } catch (e) {
            console.error(e);
            console.error(await win.webContents.executeJavaScript("JSON.stringify({time:document.querySelector('audio').currentTime,duration:document.querySelector('audio').duration,readyState:document.querySelector('audio').readyState,slider:document.querySelector('[aria-label=\"Playback position\"]').value})"));
            finish(1);
        }
    });
});
require("../out/main/index.js");
