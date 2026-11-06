const {app} = require("electron");
const {DatabaseSync} = require("node:sqlite");
const {drizzle} = require("drizzle-orm/node-sqlite");
const {migrate} = require("drizzle-orm/node-sqlite/migrator");
const {mkdtempSync, mkdirSync, rmSync, writeFileSync, statSync} = require("node:fs");
const {join} = require("node:path");
const {tmpdir} = require("node:os");
const childProcess = require("node:child_process");
const {execFileSync} = childProcess;
const {promisify} = require("node:util");
const originalExecFile = childProcess.execFile;
const execute = promisify(originalExecFile);
const mtpStorage = "/modules/kmtpd/device0/storage0";

function testExecFile(...args) {
    return originalExecFile(...args);
}

testExecFile[promisify.custom] = (command, args, options) => {
    if (command !== "busctl") return execute(command, args, options);
    const method = args[7];
    const fixture = {
        listDevices: [["/modules/kmtpd/device0"]],
        listStorages: [[mtpStorage]],
        friendlyName: "Fixture phone",
        description: "Internal storage",
        freeSpaceInBytes: 100000000,
        getFilesAndFolders: args.at(-1) === "/" ? [[[1, 0, 1, "Music", 0, 0, "inode/directory"]], 0] : [[], 0],
    };
    if (!(method in fixture)) return Promise.reject(new Error("Unexpected MTP method: " + method));
    return Promise.resolve({stdout: JSON.stringify({data: fixture[method]}), stderr: ""});
};
childProcess.execFile = testExecFile;

const profile = mkdtempSync(join(tmpdir(), "btunes-large-library-"));
const artifacts = join(tmpdir(), "btunes-ui-review");
const music = join(profile, "music");
mkdirSync(music);
mkdirSync(artifacts, {recursive: true});
app.setPath("userData", profile);

const source = join(music, "Silence.mp3");
execFileSync("ffmpeg", [
    "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=8000:cl=mono", "-t", "60",
    "-metadata", "title=Silence", "-metadata", "artist=Fixture artist", "-metadata", "album=Album 000",
    "-metadata", "genre=Ambient", source,
]);

const database = new DatabaseSync(join(profile, "library.sqlite"));
migrate(drizzle({client: database}), {migrationsFolder: join(__dirname, "../drizzle")});
database.exec("BEGIN");
const insert = database.prepare("INSERT INTO tracks (id,path,title,artist,album,genre,year,duration,size,album_artist,modified_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
for (let index = 0; index < 2300; index++) {
    const path = index ? join(music, "fixture-" + index + ".mp3") : source;
    if (index) writeFileSync(path, "");
    const info = statSync(path);
    insert.run(index + 1, path,
        index ? "Song " + String(index).padStart(4, "0") : "Silence",
        index ? "Artist " + String(index % 30).padStart(2, "0") : "Fixture artist", "Album " + String(Math.floor(index / 10)).padStart(3, "0"),
        index === 1 ? "Uncategorized" : index % 2 ? "Jazz" : "Ambient", 2000 + index % 25, 60, info.size, "Fixture artist", info.mtimeMs);
}
const folderInfo = statSync(music);
database.prepare("INSERT INTO folders (path,identity) VALUES (?,?)").run(music, folderInfo.dev + ":" + folderInfo.ino);
database.prepare("INSERT INTO playlists(name,rule) VALUES (?,?)").run("Road trip", null);
database.exec("COMMIT");
database.close();

let finished = false;

function finish(code) {
    if (finished) return;
    finished = true;
    rmSync(profile, {recursive: true, force: true});
    app.exit(code);
}

setTimeout(() => {
    console.error("Large-library UI test timed out");
    finish(1);
}, 60000);

app.on("browser-window-created", (_, win) => {
    win.hide();
    win.webContents.on("console-message", (ev) => {
        if (ev.level === "error" || ev.level === "warning") console.error(ev.message);
    });
    const capture = async (name) => {
        await win.webContents.executeJavaScript("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 100))))");
        const screenshot = await win.webContents.capturePage();
        writeFileSync(join(artifacts, name + ".png"), screenshot.toPNG());
    };

    win.webContents.once("did-finish-load", async () => {
        try {
            const results = await win.webContents.executeJavaScript(`(async () => {
                const waitFor = async (predicate) => {
                    const deadline = performance.now() + 5000;
                    while (!predicate()) {
                        if (performance.now() > deadline) throw new Error("UI condition timed out: " + predicate);
                        await new Promise(resolve => setTimeout(resolve, 20));
                    }
                };
                const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                const button = text => [...document.querySelectorAll('button')].find(item => item.textContent.trim() === text);
                const visible=(item,viewport)=>{
                    if(!item || !viewport) return false;
                    const bounds=item.getBoundingClientRect();
                    const container=viewport.getBoundingClientRect();
                    return bounds.top>=container.top-1 && bounds.bottom<=container.bottom+1;
                };
                const colorCanvas = document.createElement('canvas');
                colorCanvas.width = colorCanvas.height = 1;
                const colorContext = colorCanvas.getContext('2d', {willReadFrequently:true});
                const color = value => {
                    colorContext.clearRect(0, 0, 1, 1);
                    colorContext.fillStyle = value;
                    colorContext.fillRect(0, 0, 1, 1);
                    const channels = [...colorContext.getImageData(0, 0, 1, 1).data];
                    return [...channels.slice(0, 3), channels[3] / 255];
                };
                const composite = (foreground, background) => foreground.slice(0, 3).map((channel, index) =>
                    channel * foreground[3] + background[index] * (1 - foreground[3])
                ).concat(1);
                const background = element => {
                    const ancestors = [];
                    for (let current = element; current; current = current.parentElement) ancestors.unshift(current);
                    return ancestors.reduce((result, current) => composite(color(getComputedStyle(current).backgroundColor), result), [255,255,255,1]);
                };
                const luminance = channels => channels.slice(0, 3).reduce((result, channel, index) => {
                    const value = channel / 255;
                    const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
                    return result + linear * [0.2126,0.7152,0.0722][index];
                }, 0);
                const contrast = (foreground, surface) => {
                    const values = [luminance(composite(foreground, surface)), luminance(surface)].sort((a,b) => a-b);
                    return (values[1] + 0.05) / (values[0] + 0.05);
                };
                const assertContrast = (element, minimum, label) => {
                    if (!element) throw new Error('Missing contrast target: ' + label);
                    const foreground = color(getComputedStyle(element).color);
                    for (let current = element; current; current = current.parentElement) foreground[3] *= Number(getComputedStyle(current).opacity);
                    const ratio = contrast(foreground, background(element));
                    if (ratio < minimum) throw new Error(label + ' contrast is ' + ratio.toFixed(2) + ':1; expected ' + minimum + ':1');
                };
                const assertControlContrast = (element, label) => {
                    const style = getComputedStyle(element);
                    if (parseFloat(style.borderTopWidth) === 0) throw new Error(label + ' has no visible boundary');
                    const border = color(style.borderTopColor);
                    const ratio = Math.min(contrast(border, background(element)), contrast(border, background(element.parentElement)));
                    if (ratio < 3) throw new Error(label + ' boundary contrast is ' + ratio.toFixed(2) + ':1; expected 3:1');
                };
                const assertSelectionContrast = (element, label) => {
                    const shadow = getComputedStyle(element).boxShadow;
                    const markers = shadow.split(/,(?![^(]*\\))/)
                        .filter(part => part.includes('inset'))
                        .map(part => part.match(/(?:rgba?|color|oklch|oklab|lab|lch)\\([^)]*\\)/)?.[0])
                        .filter(Boolean);
                    if (!markers.length) throw new Error(label + ' has no inset selection marker');
                    const ratio = Math.max(...markers.map(marker => contrast(color(marker), background(element))));
                    if (ratio < 3) throw new Error(label + ' marker contrast is ' + ratio.toFixed(2) + ':1; expected 3:1');
                };
                window.uiReview = { waitFor, frame, button, visible, assertContrast, assertControlContrast, assertSelectionContrast };
                await waitFor(() => document.querySelector('[data-track-id="1"]'));
                if(document.querySelector('h1')?.textContent!=='Songs') throw new Error('Songs must be the default view');
                await frame();
                for (const selector of ['h1', '.library-stats', '[data-track-id="1"] strong', '[data-track-id="1"] [data-column="artist"]', 'nav button']) {
                    assertContrast(document.querySelector(selector), 4.5, selector);
                }
                assertControlContrast(document.querySelector('[aria-label="Search your library"]').closest('[data-slot="input-group"]'), 'Library search');
                assertContrast(document.querySelector('[aria-label="Sort by Artist"] svg'), 3, 'Enabled sort icon');
                assertSelectionContrast(document.querySelector('nav [aria-current="page"]'), 'Active navigation');
                button('Albums').click();
                await waitFor(() => document.querySelectorAll('.album').length);
                const albumNodes = document.querySelectorAll('.album').length;
                if (albumNodes > 60) throw new Error("Albums are not virtualized");
                const snapshot = await window.btunes.rpc('library.get',undefined);
                if (snapshot.tracks.length !== 2300) throw new Error("Fixture must have 2300 tracks");
                const unchanged = await window.btunes.rpc('library.get',{revision:snapshot.revision});
                if (unchanged !== null) throw new Error("Unchanged library was retransmitted");
                button('Songs').click();
                await waitFor(() => document.querySelector('[data-track-id="1"]'));
                const main=document.querySelector('main');
                main.style.width='1800px';
                await frame();
                const tableWidth=document.querySelector('.track-table').getBoundingClientRect().width;
                const viewportWidth=document.querySelector('.track-scroll').clientWidth;
                if(tableWidth < viewportWidth - 1) throw new Error('Songs table does not fill a wide viewport');
                main.style.width='';
                await frame();
                if(document.querySelector('.track-scroll').scrollWidth>document.querySelector('.track-scroll').clientWidth+1) throw new Error('Songs table has horizontal overflow');
                const songNodes = document.querySelectorAll('[data-track-id]').length;
                if (songNodes > 60) throw new Error("Song table is not virtualized");
                for (const name of ['Title','Artist','Album','Genre','Duration','Year','Plays']) {
                    const control=document.querySelector('[aria-label="Sort by '+name+'"]');
                    if(!control) throw new Error('Missing sortable column '+name);
                }
                const genreSort=document.querySelector('[aria-label="Sort by Genre"]');
                genreSort.click();
                await waitFor(()=>document.querySelector('th[data-column="genre"]').getAttribute('aria-sort')==='ascending');
                await waitFor(()=>document.querySelector('[data-track-id]')?.dataset.trackId==='2');
                genreSort.click();
                await waitFor(()=>document.querySelector('th[data-column="genre"]').getAttribute('aria-sort')==='descending');
                if(document.querySelector('[data-track-id]').dataset.trackId!=='2') throw new Error('Missing genre must stay first');
                document.querySelector('[aria-label="Sort by Title"]').click();
                await waitFor(()=>document.querySelector('[data-track-id="1"]'));
                const resize=document.querySelector('[aria-label="Resize Title column"]');
                const width=Number(resize.getAttribute('aria-valuenow'));
                resize.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
                await waitFor(()=>Number(resize.getAttribute('aria-valuenow'))===width+16);
                const albumResize=document.querySelector('[aria-label="Resize Album column"]');
                const albumWidth=Number(albumResize.getAttribute('aria-valuenow'));
                const handle=albumResize.getBoundingClientRect();
                albumResize.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientX:handle.x+4,clientY:handle.y+10,buttons:1}));
                document.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:handle.x+44,clientY:handle.y+10,buttons:1}));
                document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,clientX:handle.x+44,clientY:handle.y+10}));
                await waitFor(()=>Number(albumResize.getAttribute('aria-valuenow'))===albumWidth+40);
                button('Artists').click();
                await waitFor(()=>document.querySelector('.artist'));
                button('Songs').click();
                await waitFor(()=>document.querySelector('[aria-label="Resize Title column"]'));
                if(Number(document.querySelector('[aria-label="Resize Title column"]').getAttribute('aria-valuenow'))!==width+16) throw new Error('Column width did not persist');
                if(document.querySelector('.track-table input[type="checkbox"]') || document.querySelector('[aria-label="Edit tags for Silence"]')) throw new Error('Row checkboxes or edit actions remain');
                if(document.querySelector('nav button').textContent.trim()!=='Songs') throw new Error('Songs should be first in navigation');
                const header=document.querySelector('.track-table thead');
                const headerRect=header.getBoundingClientRect();
                header.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2,clientX:headerRect.x+80,clientY:headerRect.y+20}));
                await waitFor(()=>document.querySelector('[role="menuitemcheckbox"]'));
                const albumArtistToggle=[...document.querySelectorAll('[role="menuitemcheckbox"]')].find(item=>item.textContent.trim()==='Album artist');
                if(!albumArtistToggle) throw new Error('Album artist column is unavailable');
                albumArtistToggle.click();
                await waitFor(()=>document.querySelector('th[data-column="albumArtist"]'));
                const genreToggle=[...document.querySelectorAll('[role="menuitemcheckbox"]')].find(item=>item.textContent.trim()==='Genre');
                genreToggle.click();
                await waitFor(()=>!document.querySelector('th[data-column="genre"]'));
                if(document.querySelector('td[data-column="genre"]')) throw new Error('Hidden column cells remain');
                document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
                button('Artists').click();
                await waitFor(()=>document.querySelector('.artist'));
                button('Songs').click();
                await waitFor(()=>document.querySelector('.track-table'));
                if(document.querySelector('th[data-column="genre"]')) throw new Error('Column visibility did not persist');
                const restoredHeader=document.querySelector('.track-table thead');
                restoredHeader.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2,clientX:300,clientY:250}));
                await waitFor(()=>document.querySelector('[role="menuitemcheckbox"]'));
                [...document.querySelectorAll('[role="menuitemcheckbox"]')].find(item=>item.textContent.trim()==='Genre').click();
                await waitFor(()=>document.querySelector('th[data-column="genre"]'));
                document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
                const rowById=id=>document.querySelector('[data-track-id="'+id+'"]');
                rowById(1).dispatchEvent(new MouseEvent('click',{bubbles:true}));
                rowById(3).dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true}));
                await waitFor(()=>rowById(1).getAttribute('aria-selected')==='true' && rowById(3).getAttribute('aria-selected')==='true');
                await frame();
                assertSelectionContrast(rowById(1), 'Selected song');
                rowById(5).dispatchEvent(new MouseEvent('click',{bubbles:true,shiftKey:true}));
                await waitFor(()=>[3,4,5].every(id=>rowById(id)?.getAttribute('aria-selected')==='true'));
                if(rowById(1).getAttribute('aria-selected')==='true') throw new Error('Shift selection should replace the previous set');
                rowById(1).dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true}));
                await waitFor(()=>document.querySelectorAll('[data-track-id][aria-selected="true"]').length===4);
                rowById(1).dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2,clientX:450,clientY:300}));
                await waitFor(()=>document.querySelector('[role="menu"]')?.textContent.includes('Edit tags (4)'));
                document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
                rowById(1).dispatchEvent(new MouseEvent('click',{bubbles:true}));
                const scroll = document.querySelector('.track-scroll');
                scroll.scrollTop = scroll.scrollHeight;
                await waitFor(() => document.querySelector('[data-track-id="2300"]'));
                const search=document.querySelector('[aria-label="Search your library"]');
                const setSearch=value=>{
                    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(search,value);
                    search.dispatchEvent(new Event('input',{bubbles:true}));
                };
                setSearch('Song 2299');
                await waitFor(()=>document.querySelector('.track-table')?.getAttribute('aria-rowcount')==='2');
                await waitFor(()=>document.querySelector('[data-track-id="2300"]'));
                document.querySelector('[aria-label="Clear search"]').click();
                await waitFor(()=>document.querySelector('.track-table')?.getAttribute('aria-rowcount')==='2301');
                if(search.value || document.querySelector('[aria-label="Clear search"]')) throw new Error('Search was not cleared');
                if(document.activeElement!==search) throw new Error('Search input should retain focus after clearing');
                window.dispatchEvent(new MouseEvent('mouseup',{button:4,bubbles:true,cancelable:true}));
                await waitFor(()=>search.value==='Song 2299' && document.querySelector('.track-table')?.getAttribute('aria-rowcount')==='2');
                window.dispatchEvent(new MouseEvent('mouseup',{button:3,bubbles:true,cancelable:true}));
                await waitFor(()=>!search.value && document.querySelector('.track-table')?.getAttribute('aria-rowcount')==='2301');
                scroll.scrollTop = 0;
                await waitFor(() => document.querySelector('[data-track-id="1"]'));
                const first = document.querySelector('[data-track-id="1"]');
                const rectangle = first.getBoundingClientRect();
                first.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2,clientX:rectangle.x+200,clientY:rectangle.y+30}));
                await waitFor(() => document.querySelector('[role="menu"]'));
                const menu = document.querySelector('[role="menu"]').textContent;
                for (const label of ['Play now','Play next','Add to queue','Edit tags','Add to playlist','Go to artist','Go to album','Show in folder','Copy file path']) {
                    if (!menu.includes(label)) throw new Error("Missing context action: "+label);
                }
                return {songs:2300, mountedSongRows:songNodes, mountedAlbums:albumNodes};
            })()`, true);
            await capture("songs-context-menu");

            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor}=window.uiReview;
                [...document.querySelectorAll('[role="menuitem"]')].find(item=>item.textContent.trim()==='Go to album').click();
                await waitFor(()=>document.querySelector('.album-dialog .track-table'));
                if(document.querySelector('.album-dialog [data-slot="dialog-title"]').textContent.trim()!=='Album 000') throw new Error('Go to album opened the wrong album');
                if(document.querySelector('.album-dialog .track-table').getAttribute('aria-rowcount')!=='11') throw new Error('Go to album must include every song in the album');
                window.dispatchEvent(new MouseEvent('mouseup',{button:3,bubbles:true,cancelable:true}));
                await waitFor(()=>!document.querySelector('.album-dialog'));
                const song=document.querySelector('[data-track-id="1"]');
                const bounds=song.getBoundingClientRect();
                song.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2,clientX:bounds.x+150,clientY:bounds.y+20}));
                await waitFor(()=>document.querySelector('[role="menu"]'));
                [...document.querySelectorAll('[role="menuitem"]')].find(item=>item.textContent.trim()==='Go to artist').click();
                await waitFor(()=>document.querySelector('[aria-label="Clear artist filter"]'));
                if(document.querySelector('.track-table').getAttribute('aria-rowcount')!=='2301') throw new Error('Go to artist must use album artist');
                document.querySelector('[aria-label="Show all songs"]').click();
                window.uiReview.button('Albums').click();
                await waitFor(()=>document.querySelector('.album'));
                if(document.querySelector('[aria-label="Filter by genre"]') || document.querySelector('[aria-label="Filter by artist"]')) throw new Error('Collection dropdown filters remain');
                const cards=[...document.querySelectorAll('.album')];
                cards[0].dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true}));
                cards[1].dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true}));
                await waitFor(()=>document.querySelectorAll('.album[aria-selected="true"]').length===2);
                cards[3].dispatchEvent(new MouseEvent('click',{bubbles:true,shiftKey:true}));
                await waitFor(()=>document.querySelectorAll('.album[aria-selected="true"]').length===3);
                if(document.querySelector('.album-dialog')) throw new Error('Modifier selection should not open an album');
                if(document.querySelector('[aria-label="Selected albums"]')) throw new Error('Album selection bar should be removed');
                const chosen=document.querySelector('.album[aria-selected="true"]');
                const chosenRect=chosen.getBoundingClientRect();
                chosen.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2,clientX:chosenRect.x+20,clientY:chosenRect.y+20}));
                await waitFor(()=>document.querySelector('[role="menu"]'));
                [...document.querySelectorAll('[role="menuitem"]')].find(item=>item.textContent.trim().startsWith('Edit tags')).click();
                await waitFor(()=>document.querySelector('.tag-editor'));
                if(!document.querySelector('.tag-editor').textContent.includes('30 selected songs')) throw new Error('Album batch edit did not include every selected song');
                window.uiReview.button('Cancel').click();
                await waitFor(()=>!document.querySelector('.tag-editor'));
                document.querySelector('[aria-label="Albums"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
                await waitFor(()=>!document.querySelector('.album[aria-selected="true"]'));
                document.querySelector('.album').click();
                await waitFor(()=>document.querySelector('.album-dialog [data-track-id]'));
                const table=document.querySelector('.album-dialog .track-table');
                if(table.getAttribute('aria-rowcount')!=='11') throw new Error('Album did not use the shared song table');
                if(!document.querySelector('.album-dialog .library-stats').textContent.includes('1 album artist')) throw new Error('Album dialog is missing artist counts');
                const albumRows=[...document.querySelectorAll('.album-dialog [data-track-id]')];
                albumRows[0].click();
                albumRows[1].dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true}));
                albumRows[3].dispatchEvent(new MouseEvent('click',{bubbles:true,shiftKey:true}));
                await waitFor(()=>document.querySelectorAll('.album-dialog [data-track-id][aria-selected="true"]').length===3);
                window.uiReview.button('Edit selected songs').click();
                await waitFor(()=>document.querySelector('.tag-editor'));
                if(!document.querySelector('.tag-editor').textContent.includes('3 selected songs')) throw new Error('Album song selection was not passed to tag editing');
                window.uiReview.button('Cancel').click();
                await waitFor(()=>!document.querySelector('.tag-editor'));
            })()`, true);
            await capture("album-songs");
            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor}=window.uiReview;
                document.querySelector('.album-dialog [data-slot="dialog-close"]').click();
                await waitFor(()=>!document.querySelector('.album-dialog'));
                document.querySelector('[aria-label="Albums"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
                await waitFor(()=>!document.querySelector('.album[aria-selected="true"]'));
            })()`, true);
            const marqueeBounds = await win.webContents.executeJavaScript(`(() => {
                const cells=document.querySelectorAll('[aria-label="Albums"] .virtual-grid-cell');
                const first=cells[0].getBoundingClientRect();
                const second=cells[1].getBoundingClientRect();
                return {startX:Math.round(second.right+3),startY:Math.round(first.top+3),endX:Math.round(first.left+3),endY:Math.round(first.bottom-5)};
            })()`);
            win.webContents.sendInputEvent({type: 'mouseDown', x: marqueeBounds.startX, y: marqueeBounds.startY, button: 'left', clickCount: 1});
            win.webContents.sendInputEvent({type: 'mouseMove', x: marqueeBounds.endX, y: marqueeBounds.endY});
            await win.webContents.executeJavaScript(`window.uiReview.waitFor(()=>document.querySelectorAll('.album[aria-selected="true"]').length>=2)`);
            await capture("album-marquee");
            win.webContents.sendInputEvent({type: 'mouseUp', x: marqueeBounds.endX, y: marqueeBounds.endY, button: 'left', clickCount: 1});
            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor}=window.uiReview;
                if(document.querySelector('.album-dialog')) throw new Error('Marquee selection opened an album');
                document.querySelector('[aria-label="Play album Album 000"]').click();
                await waitFor(()=>!document.querySelector('audio').paused);
                if(document.querySelector('.album-dialog')) throw new Error('Play album should play directly without opening the album');
                window.uiReview.button('Songs').click();
                await waitFor(()=>document.querySelector('[data-track-id="1"]'));
                const first=document.querySelector('[data-track-id="1"]');
                const rect=first.getBoundingClientRect();
                first.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2,clientX:rect.x+200,clientY:rect.y+30}));
                await waitFor(()=>document.querySelector('[role="menu"]'));
            })()`, true);


            const interactions = await win.webContents.executeJavaScript(`(async () => {
                const {waitFor,frame,button} = window.uiReview;
                [...document.querySelectorAll('[role="menuitem"]')].find(item=>item.textContent.trim()==='Add to queue').click();
                await waitFor(() => !document.querySelector('[role="menu"]'));
                document.querySelector('[aria-label="Show queue"]').click();
                await waitFor(()=>document.querySelector('.queue-track')?.textContent.includes('Silence'));
                const queue=document.querySelector('.queue');
                const queueRect=queue.getBoundingClientRect();
                const headerRect=document.querySelector('.track-table thead').getBoundingClientRect();
                if(!document.elementFromPoint(queueRect.x+20,headerRect.y+10)?.closest('.queue')) throw new Error('Song headings overlap the queue');
                if(!document.querySelector('[aria-label="Close queue"]')) throw new Error('Queue must have an icon close button');
                document.querySelector('[aria-label="Close queue"]').click();
                document.querySelector('[aria-label="Play Silence"]').click();
                const audio = document.querySelector('audio');
                await waitFor(() => !document.querySelector('[aria-label="Playback position"]').disabled);
                await audio.play();
                await waitFor(() => !audio.paused);
                const repeat=document.querySelector('[aria-label="Repeat"]');
                if(repeat.dataset.repeat!=='off') throw new Error('Repeat must start disabled');
                repeat.click();
                await waitFor(()=>repeat.dataset.repeat==='all');
                repeat.click();
                await waitFor(()=>repeat.dataset.repeat==='one');
                const repeatedSource=audio.src;
                audio.currentTime=0.5;
                audio.dispatchEvent(new Event('ended'));
                await waitFor(()=>audio.currentTime<0.5 && !audio.paused);
                if(audio.src!==repeatedSource) throw new Error('Repeat one must keep the current song');
                repeat.click();
                await waitFor(()=>repeat.dataset.repeat==='off');
                await frame();

                let libraryMutations = 0;
                const observer = new MutationObserver(records => {libraryMutations += records.length});
                observer.observe(document.querySelector('.collection-results'),{childList:true,subtree:true,attributes:true});
                for (let index=0; index<30; index++) audio.dispatchEvent(new Event('timeupdate'));
                await frame();
                observer.disconnect();
                if (libraryMutations) throw new Error("Playback progress rerendered the song collection");

                const start=performance.now();
                const playingRow=document.querySelector('[data-track-id="1"]');
                const playingRect=playingRow.getBoundingClientRect();
                playingRow.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2,clientX:playingRect.x+150,clientY:playingRect.y+20}));
                await waitFor(()=>document.querySelector('[role="menu"]'));
                if(getComputedStyle(document.querySelector('[role="menu"]')).animationName!=='none') throw new Error('Context menu must appear without animation');
                [...document.querySelectorAll('[role="menuitem"]')].find(item=>item.textContent.trim()==='Edit tags').click();
                await waitFor(() => document.getElementById('tag-title'));
                await frame();
                const openTagEditorMs=Math.round(performance.now()-start);
                const input=document.getElementById('tag-title');
                window.uiReview.assertControlContrast(input, 'Tag title input');
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Responsive while playing');
                input.dispatchEvent(new Event('input',{bubbles:true}));
                await frame();
                if(input.value!=='Responsive while playing' || button('Save').disabled) throw new Error("Editor did not accept input during playback");
                if(audio.paused) throw new Error("Editing tags interrupted playback");
                return {openTagEditorMs, libraryMutationsDuringProgress:libraryMutations};
            })()`, true);
            await win.webContents.executeJavaScript(`(() => {
                if(!document.querySelector('[data-slot="dialog-overlay"]')) throw new Error('Tag editor must be a fixed modal');
                if(document.querySelector('.tag-editor').textContent.includes('Preview changes')) throw new Error('Tag editor still shows a preview step');
                if(!document.getElementById('tag-albumArtist')) throw new Error('Album artist field is missing');
            })()`, true);
            await capture("tag-editor-playing");
            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor,button}=window.uiReview;
                button('Cancel').click();
                await waitFor(()=>!document.querySelector('[role="dialog"]'));
            })()`, true);
            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor,button,visible}=window.uiReview;
                const audio=document.querySelector('audio');
                const paused=audio.paused;
                const position=audio.currentTime;
                const locate=()=>document.querySelector('.player-bar [aria-label="Show playing song"]').click();
                let viewport=document.querySelector('.track-scroll');
                viewport.scrollTop=viewport.scrollHeight;
                await waitFor(()=>!visible(document.querySelector('[data-track-id="1"]'),viewport));
                locate();
                await waitFor(()=>visible(document.querySelector('[data-track-id="1"]'),viewport));
                if(document.querySelector('[data-track-id="1"]').getAttribute('aria-selected')!=='true') throw new Error('Located song should be selected');
                button('Albums').click();
                await waitFor(()=>document.querySelector('.album'));
                viewport=document.querySelector('[aria-label="Albums"]');
                viewport.scrollTop=viewport.scrollHeight;
                await waitFor(()=>!visible(document.querySelector('.album[aria-current="true"]'),viewport));
                locate();
                await waitFor(()=>visible(document.querySelector('.album[aria-current="true"]'),viewport));
                if(document.querySelector('.album[aria-current="true"]').getAttribute('aria-selected')!=='true') throw new Error('Located album should be selected');
                if(document.querySelector('[aria-label="Selected albums"]')) throw new Error('Album selection toolbar remains');
                document.querySelector('.album[aria-current="true"]').click();
                await waitFor(()=>document.querySelector('.album-dialog'));
                document.querySelector('.album-dialog [aria-label="Show playing song"]').click();
                await waitFor(()=>document.querySelector('.album-dialog [data-track-id="1"][aria-selected="true"]'));
                document.querySelector('.album-dialog [data-slot="dialog-close"]').click();
                await waitFor(()=>!document.querySelector('.album-dialog'));
                button('Artists').click();
                await waitFor(()=>document.querySelector('.artist'));
                viewport=document.querySelector('[aria-label="Artists"]');
                viewport.scrollTop=viewport.scrollHeight;
                if(document.querySelectorAll('.artist').length!==1) throw new Error('Artists must group by album artist');
                locate();
                await waitFor(()=>visible(document.querySelector('.artist[aria-current="true"]'),viewport));
                if(audio.paused!==paused || audio.currentTime<position) throw new Error('Revealing the playing item changed playback');
            })()`, true);
            await capture("playing-artist");
            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor}=window.uiReview;
                document.querySelector('.artist[aria-current="true"]').click();
                await waitFor(()=>document.querySelector('.artist-dialog .track-table'));
                if(document.querySelector('.artist-dialog [data-slot="dialog-title"]').textContent.trim()!=='Fixture artist') throw new Error('Artist dialog has the wrong title');
                if(document.querySelector('.artist-dialog .track-table').getAttribute('aria-rowcount')!=='2301') throw new Error('Artist dialog must contain all album-artist songs');
                if(document.querySelectorAll('.artist-dialog [data-track-id]').length>40) throw new Error('Artist dialog must remain virtualized');
                window.dispatchEvent(new MouseEvent('mouseup',{button:3,bubbles:true,cancelable:true}));
                await waitFor(()=>!document.querySelector('.artist-dialog'));
                if(document.querySelector('h1').textContent!=='Artists') throw new Error('Mouse back should close the dialog first');
            })()`, true);

            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor,button,visible}=window.uiReview;
                button('Songs').click();
                await waitFor(()=>document.querySelector('.track-table'));
                const search=document.querySelector('[aria-label="Search your library"]');
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(search,'Song 2299');
                search.dispatchEvent(new Event('input',{bubbles:true}));
                await waitFor(()=>document.querySelector('.track-table')?.getAttribute('aria-rowcount')==='2');
                button('Albums').click();
                await waitFor(()=>document.querySelector('h1').textContent==='Albums');
                window.dispatchEvent(new MouseEvent('mouseup',{button:3,bubbles:true,cancelable:true}));
                await waitFor(()=>document.querySelector('h1').textContent==='Songs' && document.querySelector('.track-table')?.getAttribute('aria-rowcount')==='2');
                if(document.querySelector('[aria-label="Search your library"]').value!=='Song 2299') throw new Error('Back navigation should restore search');
                window.dispatchEvent(new MouseEvent('mouseup',{button:4,bubbles:true,cancelable:true}));
                await waitFor(()=>document.querySelector('h1').textContent==='Albums');
                window.dispatchEvent(new MouseEvent('mouseup',{button:3,bubbles:true,cancelable:true}));
                await waitFor(()=>document.querySelector('h1').textContent==='Songs' && document.querySelector('[aria-label="Search your library"]').value==='Song 2299');
                document.querySelector('[aria-label="Clear search"]').click();
                await waitFor(()=>!search.value);
                window.dispatchEvent(new MouseEvent('mouseup',{button:3,bubbles:true,cancelable:true}));
                await waitFor(()=>document.querySelector('h1').textContent==='Artists');
                window.dispatchEvent(new MouseEvent('mouseup',{button:4,bubbles:true,cancelable:true}));
                await waitFor(()=>document.querySelector('h1').textContent==='Songs' && !search.value);
                window.dispatchEvent(new MouseEvent('mouseup',{button:4,bubbles:true,cancelable:true}));
                await waitFor(()=>document.querySelector('[aria-label="Search your library"]').value==='Song 2299');
                document.querySelector('.player-bar [aria-label="Show playing song"]').click();
                await waitFor(()=>!search.value && visible(document.querySelector('[data-track-id="1"]'),document.querySelector('.track-scroll')));
                if(document.querySelector('.track-table').getAttribute('aria-rowcount')!=='2301') throw new Error('Reveal should clear filters hiding the playing song');
                button('Possible duplicates').click();
                await waitFor(()=>document.querySelector('[data-slot="empty-title"]')?.textContent==='No duplicates');
                const empty=document.querySelector('[data-slot="empty"]').textContent;
                if(empty.includes('playlist') || empty.includes('Add music folder')) throw new Error("Incorrect duplicates empty state");
            })()`, true);
            await capture("duplicates-empty");

            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor,button,visible}=window.uiReview;
                button('Devices').click();
                await waitFor(()=>document.querySelector('h1')?.textContent==='Devices');
                if(document.querySelector('.library-hero .library-stats')) throw new Error('Device page shows local library counts');
                await waitFor(()=>[...document.querySelectorAll('[data-slot="card-title"]')].some(title=>title.textContent==='Fixture phone'));
                const storage=[...document.querySelectorAll('button')].find(item=>item.textContent.includes('Internal storage'));
                storage.click();
                await waitFor(()=>[...document.querySelectorAll('button')].some(item=>item.textContent.trim()==='Music'));
                button('Music').click();
                await waitFor(()=>!button('Compare with PC').disabled);
                button('Compare with PC').click();
                await waitFor(()=>button('Copy missing songs') && !button('Copy missing songs').disabled);
                if(!document.querySelector('.devices-page').textContent.includes('Missing on phone')) throw new Error('Phone comparison did not render');
                const page=document.querySelector('.devices-page');
                if(page.scrollHeight<=page.clientHeight) throw new Error('Device content must scroll vertically');
                for(const card of page.querySelectorAll('[data-slot="card"]')) {
                    if(card.scrollHeight>card.clientHeight+1) throw new Error('Device card contents are clipped');
                }
                page.scrollTop=page.scrollHeight;
                await waitFor(()=>visible(button('Copy missing songs'),page));
            })()`, true);
            await capture("devices-scrolled");
            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor,button}=window.uiReview;
                button('Settings').click();
                await waitFor(()=>document.querySelector('h1')?.textContent==='Settings');
                if(document.querySelector('[role="dialog"]')) throw new Error('Settings should be a page');
                if(document.querySelector('.topbar')) throw new Error('Settings should not show the library toolbar');
                if(!button('Add music folder')) throw new Error("Settings does not expose folder management");
                if(!document.querySelector('.folder-list').textContent.includes('music')) throw new Error("Configured folder not shown");
            })()`, true);
            await capture("settings");
            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor,frame,button,assertContrast}=window.uiReview;
                button('Sidebar').click();
                await waitFor(()=>document.querySelector('[aria-label="Navigation"]'));
                await frame();
                const list=document.querySelector('[aria-label="Navigation"]');
                if(list.children.length!==document.querySelectorAll('nav[aria-label="Library navigation"] button').length) throw new Error('Sidebar settings must show every navigation item');
                if(list.scrollHeight>list.clientHeight+1) throw new Error('Sidebar navigation list should expand instead of scrolling');
                assertContrast(list.querySelector('li span'),4.5,'Sidebar order label');
                assertContrast(list.querySelector('button svg'),3,'Sidebar drag handle');
            })()`, true);
            await capture("settings-sidebar");
            await win.webContents.executeJavaScript(`(async () => {
                window.uiReview.button('Library').click();
                window.uiReview.button('Songs').click();
                await window.uiReview.waitFor(()=>document.querySelector('.track-table'));
            })()`, true);
            await win.webContents.executeJavaScript(`(async () => {
                const volume=document.querySelector('[aria-label="Volume"]');
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(volume,'0.23');
                volume.dispatchEvent(new Event('input',{bubbles:true}));
                await window.uiReview.waitFor(()=>document.querySelector('audio').volume===0.23);
                await window.uiReview.waitFor(()=>JSON.parse(localStorage.getItem('btunes.volume.v1'))===0.23);
            })()`, true);
            win.webContents.session.flushStorageData();
            await new Promise(resolve => {
                win.webContents.once('did-finish-load', resolve);
                win.webContents.reload();
            });
            await win.webContents.executeJavaScript(`(async () => {
                const deadline=performance.now()+5000;
                while(!document.querySelector('[data-track-id]')) {
                    if(performance.now()>deadline) throw new Error('Reload did not restore library');
                    await new Promise(resolve=>setTimeout(resolve,20));
                }
                if(Number(document.querySelector('[aria-label="Volume"]').value)!==0.23 || document.querySelector('audio').volume!==0.23) throw new Error('Volume did not persist after reopening');
            })()`, true);
            await capture('compact-songs');

            const report = {...results, ...interactions, screenshots: artifacts};
            writeFileSync(join(artifacts, "report.json"), JSON.stringify(report, null, 4));
            console.log("Large-library UI passed", JSON.stringify(report));
            finish(0);
        } catch (error) {
            console.error(error);
            await capture("failure");
            finish(1);
        }
    });
});

require("../out/main/index.js");
