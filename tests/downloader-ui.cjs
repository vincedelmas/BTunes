const {app} = require('electron');
const {mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, symlinkSync, readdirSync, rmSync} = require('node:fs');
const {join} = require('node:path');
const {tmpdir} = require('node:os');
const {execFileSync} = require('node:child_process');
const {DatabaseSync} = require('node:sqlite');
const {drizzle} = require('drizzle-orm/node-sqlite');
const {migrate} = require('drizzle-orm/node-sqlite/migrator');
const profile = mkdtempSync(join(tmpdir(), 'btunes-downloader-ui-'));
const music = join(profile, 'music');
const artifacts = join(tmpdir(), 'btunes-ui-review');
mkdirSync(music);
mkdirSync(artifacts, {recursive: true});
app.setPath('userData', profile);
const source = join(profile, 'source.mp3');
execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=8000:cl=mono', '-t', '0.5', source]);
const image = join(profile, 'cover.jpg');
execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=green:s=32x32', '-frames:v', '1', image]);
const bookmarks = join(profile, 'Bookmarks');
writeFileSync(bookmarks, JSON.stringify({
    roots: {
        bookmark_bar: {
            id: '1',
            name: 'Bookmarks bar',
            type: 'folder',
            children: [{id: '2', type: 'folder', name: 'Music', children: [{name: 'Fixture Artist - Fixture Song', type: 'url', url: 'https://youtu.be/BaW_jenozKc'}]}]
        }
    }
}));
const toolRoot = join(profile, 'download-tools');
for (const name of ['yt-dlp', 'ffmpeg']) mkdirSync(join(toolRoot, name, 'fixture'), {recursive: true});
writeFileSync(join(toolRoot, 'versions.json'), JSON.stringify({'yt-dlp': 'fixture', ffmpeg: 'fixture'}));
const downloader = join(toolRoot, 'yt-dlp', 'fixture', 'yt-dlp');
const quote = (value) => "'" + value.replace(/'/g, "'\\''") + "'";
writeFileSync(downloader, `#!/bin/sh
if [ "$1" = "--version" ]; then echo fixture; exit 0; fi
while [ "$#" -gt 0 ]; do
 if [ "$1" = "--output" ]; then shift; output="$1"; break; fi
 shift
done
output=$(printf '%s' "$output" | sed 's/%(ext)s/mp3/')
printf 'download:100%%\n'
exec cp ${quote(source)} "$output"
`);
chmodSync(downloader, 0o755);
symlinkSync('/usr/bin/ffmpeg', join(toolRoot, 'ffmpeg', 'fixture', 'ffmpeg'));
symlinkSync('/usr/bin/ffprobe', join(toolRoot, 'ffmpeg', 'fixture', 'ffprobe'));
const db = new DatabaseSync(join(profile, 'library.sqlite'));
migrate(drizzle({client: db}), {migrationsFolder: join(__dirname, '../drizzle')});
db.prepare('INSERT INTO folders(path) VALUES (?)').run(music);
db.prepare('INSERT INTO app_settings(key,value) VALUES (?,?)').run('downloader', JSON.stringify({
    bookmarksFile: bookmarks,
    folderId: '2',
    destination: music,
    namePattern: '{artist} - {title}',
    quality: '192k',
    concurrency: 1,
    fetchMetadata: true
}));
db.close();
global.fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.hostname === 'api.github.com') return Response.json({tag_name: 'fixture', assets: []});
    if (url.hostname === 'musicbrainz.org') return Response.json({
        recordings: [{
            title: 'Fixture Song',
            score: 100,
            'artist-credit': [{name: 'Fixture Artist'}],
            releases: [{title: 'Fixture Album', date: '2001-01-01', status: 'Official'}]
        }]
    });
    if (url.hostname === 'itunes.apple.com') return Response.json({
        results: [{
            collectionName: 'Fixture Album',
            artistName: 'Fixture Artist',
            artworkUrl100: 'https://is1-ssl.mzstatic.com/fixture/100x100bb.jpg'
        }]
    });
    if (url.hostname.endsWith('.mzstatic.com')) return new Response(new Uint8Array(readFileSync(image)), {headers: {'Content-Type': 'image/jpeg'}});
    throw new Error('Unexpected network request: ' + url);
};
let finished = false;

function finish(code) {
    if (finished) return;
    finished = true;
    rmSync(profile, {recursive: true, force: true});
    app.exit(code);
}

setTimeout(() => {
    console.error('Downloader UI timed out');
    finish(1);
}, 45000);
app.on('browser-window-created', (_, win) => {
    win.hide();
    win.webContents.once('did-finish-load', async () => {
        try {
            await win.webContents.executeJavaScript(`(async()=>{
    const waitFor=async(predicate)=>{const end=Date.now()+10000;while(!predicate()){if(Date.now()>end)throw new Error('Download UI condition timed out');await new Promise(resolve=>setTimeout(resolve,25));}};
    const button=(label)=>[...document.querySelectorAll('button')].find(item=>item.textContent.trim()===label);
    await waitFor(()=>button('Downloads'));
    button('Downloads').click();
    await waitFor(()=>document.querySelector('.download-row')?.textContent.includes('Fixture Song'));
    window.downloaderWaitFor=waitFor;
    document.querySelector('button[aria-label="Download settings"]').click();
    await waitFor(()=>document.querySelector('[role="tab"][aria-selected="true"]')?.textContent==='Downloads');
    await waitFor(()=>document.getElementById('download-concurrency'));
    const setInput=(id,value)=>{
        const input=document.getElementById(id);
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);
        input.dispatchEvent(new Event('input',{bubbles:true}));
    };
    const tab=(label)=>[...document.querySelectorAll('[role="tab"]')].find(item=>item.textContent===label);
    setInput('download-concurrency','2');
    tab('Library').click();
    await waitFor(()=>tab('Library').getAttribute('aria-selected')==='true');
    tab('Downloads').click();
    await waitFor(()=>tab('Downloads').getAttribute('aria-selected')==='true');
    if(document.getElementById('download-concurrency').value!=='2')throw new Error('Tab switching lost unsaved settings');
    button('Discard').click();
    await waitFor(()=>document.getElementById('download-concurrency').value==='1');
    setInput('download-concurrency','2');
    button('Save changes').click();
    await waitFor(()=>[...document.querySelectorAll('[role="status"]')].some(item=>item.textContent==='Changes saved.'));
    const settings=await window.btunes.rpc('downloads.settings.get',undefined);
    if(settings.concurrency!==2)throw new Error('Settings save did not persist');
    if(document.querySelector('.settings-page').scrollWidth>document.querySelector('.settings-page').clientWidth)throw new Error('Settings overflow horizontally');
   })()`);
            await win.webContents.executeJavaScript("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
            writeFileSync(join(artifacts, 'download-settings.png'), (await win.webContents.capturePage()).toPNG());
            win.setMinimumSize(900, 650);
            win.setSize(900, 650);
            await win.webContents.executeJavaScript(`(async()=>{
    const page=document.querySelector('.settings-page');
    page.scrollTop=page.scrollHeight;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const save=[...document.querySelectorAll('button')].find(item=>item.textContent.trim()==='Save changes');
    const bounds=save.getBoundingClientRect();
    if(page.scrollWidth>page.clientWidth || bounds.bottom>page.getBoundingClientRect().bottom)throw new Error('Small-window settings overflow or hide the save action');
   })()`);
            writeFileSync(join(artifacts, 'download-settings-small.png'), (await win.webContents.capturePage()).toPNG());
            win.setSize(1000, 700);
            await win.webContents.executeJavaScript(`(async()=>{
    const button=(label)=>[...document.querySelectorAll('button')].find(item=>item.textContent.trim()===label);
    button('Downloads').click();
    await window.downloaderWaitFor(()=>document.querySelector('.download-row'));
    await window.downloaderWaitFor(()=>!button('Download available').disabled);
    button('Download available').click();
    await window.downloaderWaitFor(()=>button('Review & save'));
    const library=await window.btunes.rpc('library.get',undefined);
    if(library.tracks.length)throw new Error('Unreviewed song was published');
   })()`);
            for (const width of [900, 1440]) {
                win.setSize(width, 700);
                await win.webContents.executeJavaScript(`(async()=>{
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const row=document.querySelector('.download-row');
    const badge=row.querySelector('[data-slot="badge"]').getBoundingClientRect();
    const action=row.querySelector('button').getBoundingClientRect();
    const message=row.querySelector('[title]').getBoundingClientRect();
    if(badge.right+8>action.left || message.right+8>action.left)throw new Error('Download status overlaps its action');
    if(row.scrollWidth>row.clientWidth)throw new Error('Download row overflows horizontally');
   })()`);
            }
            writeFileSync(join(artifacts, 'download-ready.png'), (await win.webContents.capturePage()).toPNG());
            win.setSize(1000, 700);
            await win.webContents.executeJavaScript(`(async()=>{
    const button=(label)=>[...document.querySelectorAll('button')].find(item=>item.textContent.trim()===label);
    button('Review & save').click();
    await window.downloaderWaitFor(()=>document.getElementById('tag-album'));
    if(document.getElementById('tag-album').value!=='Fixture Album')throw new Error('Online metadata was not applied');
    if(!document.querySelector('[aria-label="Album artwork"] img'))throw new Error('Automatic artwork was not selected');
    const album=document.getElementById('tag-album');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(album,'Reviewed Album');
    album.dispatchEvent(new Event('input',{bubbles:true}));
   })()`);
            if (readdirSync(music).length) throw new Error('Staged files leaked into the music folder');
            await win.webContents.executeJavaScript("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(resolve,150))))");
            writeFileSync(join(artifacts, 'download-review.png'), (await win.webContents.capturePage()).toPNG());
            await win.webContents.executeJavaScript(`(async()=>{
    const button=(label)=>[...document.querySelectorAll('button')].find(item=>item.textContent.trim()===label);
    button('Save to library').click();
    await window.downloaderWaitFor(()=>!document.querySelector('[role="dialog"]'));
    await window.downloaderWaitFor(()=>document.querySelector('.download-row')?.textContent.includes('In your library'));
    const library=await window.btunes.rpc('library.get',undefined);
    if(library.tracks.length!==1 || library.tracks[0].album!=='Reviewed Album' || !library.tracks[0].cover)throw new Error('Reviewed tags and embedded cover were not published');
    button('Refresh bookmarks').click();
    await window.downloaderWaitFor(()=>document.querySelector('.download-row')?.textContent.includes('In your library'));
    button('Songs').click();
    await window.downloaderWaitFor(()=>document.querySelector('[data-track-id]'));
    const row=document.querySelector('[data-track-id]');const bounds=row.getBoundingClientRect();
    row.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2,clientX:bounds.x+100,clientY:bounds.y+10}));
    await window.downloaderWaitFor(()=>document.querySelector('[role="menu"]'));
    [...document.querySelectorAll('[role="menuitem"]')].find(item=>item.textContent.trim()==='Edit tags').click();
    await window.downloaderWaitFor(()=>document.querySelector('.tag-editor'));
    if(button('Find a cover') || !button('Choose image'))throw new Error('Library editing must use local artwork, not online lookup');
   })()`);
            console.log('Downloader UI passed: automatic online enrichment, review, embedded artwork, library publication, archive deduplication, local-only library editor.');
            finish(0);
        } catch (error) {
            console.error(error);
            writeFileSync(join(artifacts, 'download-failure.png'), (await win.webContents.capturePage()).toPNG());
            finish(1);
        }
    });
});
require('../out/main/index.js');
