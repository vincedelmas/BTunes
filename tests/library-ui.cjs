const {app} = require("electron");
const {DatabaseSync} = require("node:sqlite");
const {drizzle} = require("drizzle-orm/node-sqlite");
const {migrate} = require("drizzle-orm/node-sqlite/migrator");
const {mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, statSync} = require("node:fs");
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
    "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=8000", "-t", "60",
    "-metadata", "title=Silence", "-metadata", "artist=Fixture artist", "-metadata", "album=Album 000",
    "-metadata", "genre=Ambient", source,
]);

const coverImage = join(profile, "cover.jpg");
execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=c=teal:s=32x32", "-frames:v", "1", coverImage]);
global.fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.hostname === "itunes.apple.com") return Response.json({
        results: [{collectionName: "Album 000", artistName: "Fixture artist", artworkUrl100: "https://is1-ssl.mzstatic.com/fixture/100x100bb.jpg"}]
    });
    if (url.hostname.endsWith(".mzstatic.com")) return new Response(new Uint8Array(readFileSync(coverImage)), {headers: {"Content-Type": "image/jpeg"}});
    throw new Error("Unexpected network request: " + url);
};

const database = new DatabaseSync(join(profile, "library.sqlite"));
migrate(drizzle({client: database}), {migrationsFolder: join(__dirname, "../drizzle")});
database.exec("BEGIN");
const insert = database.prepare("INSERT INTO tracks (id,path,title,artist,album,genre,year,duration,size,album_artist,modified_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
for (let index = 0; index < 2300; index++) {
    const path = index ? join(music, "fixture-" + index + ".mp3") : source;
    if (index) writeFileSync(path, index === 1 ? readFileSync(source) : "");
    const info = statSync(path);
    insert.run(index + 1, path,
        index ? "Song " + String(index).padStart(4, "0") : "Silence",
        index ? "Artist " + String(index % 30).padStart(2, "0") : "Fixture artist", "Album " + String(Math.floor(index / 10)).padStart(3, "0"),
        index === 1 ? "Uncategorized" : index % 2 ? "Jazz" : "Ambient", 2000 + index % 25, 60, info.size, "Fixture artist", info.mtimeMs);
}
const folderInfo = statSync(music);
database.prepare("INSERT INTO folders (path,identity) VALUES (?,?)").run(music, folderInfo.dev + ":" + folderInfo.ino);
database.prepare("INSERT INTO playlists(name,rule) VALUES (?,?)").run("Road trip", null);
database.prepare("INSERT INTO playlists(name,rule) VALUES (?,?)").run("Jazz focus", "Jazz");
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
                window.visualizerProbe={sources:0,analyser:null};
                const createSource=AudioContext.prototype.createMediaElementSource;
                AudioContext.prototype.createMediaElementSource=function(media){
                    const source=createSource.call(this,media);
                    window.visualizerProbe.sources++;
                    return source;
                };
                const createAnalyser=AudioContext.prototype.createAnalyser;
                AudioContext.prototype.createAnalyser=function(){
                    const analyser=createAnalyser.call(this);
                    window.visualizerProbe.analyser=analyser;
                    return analyser;
                };
                await waitFor(() => document.querySelector('[data-track-id="1"]'));
                if(document.querySelector('h1')?.textContent!=='Songs') throw new Error('Songs must be the default view');
                const stats=document.querySelector('.library-hero .library-stats');
                if(!stats.textContent.includes('1 artist') || stats.textContent.includes('album artist')) throw new Error('Library artist label is incorrect');
                if(stats.querySelector('[aria-label="Total duration"]').textContent.trim()!=='38 hr 20 min') throw new Error('Library total duration is incorrect');
                const center=element=>{const rect=element.getBoundingClientRect();return rect.x+rect.width/2;};
                const middle=element=>{const rect=element.getBoundingClientRect();return rect.y+rect.height/2;};
                const separator=document.querySelector('.transport-buttons [data-slot="separator"]');
                if(Math.abs(middle(separator)-middle(document.querySelector('.play-toggle')))>1) throw new Error('Transport separator is not vertically centered');
                if(document.querySelector('th[data-column="artwork"]')) throw new Error('Artwork must be an optional hidden column');
                if(!document.querySelector('.brand [aria-label="Settings"]')) throw new Error('Settings must live beside the app name');
                if(document.querySelector('.sidebar-bottom')) throw new Error('Settings still occupies the artwork area');

                if(Math.abs(center(document.querySelector('.play-toggle'))-center(document.querySelector('.player-bar')))>1) throw new Error('Play button is not centered in the player');
                if(document.querySelector('.topbar')) throw new Error('Search toolbar should not occupy the page header');
                if(document.querySelector('.library-hero').getBoundingClientRect().height>120) throw new Error('Library header is too tall');
                const sidebarSearch=document.querySelector('.sidebar [aria-label="Search your library"]');
                if(!sidebarSearch || sidebarSearch.getBoundingClientRect().top<document.querySelector('.brand').getBoundingClientRect().bottom) throw new Error('Search should sit below the brand in the sidebar');
                const visualizer=document.querySelector('.page-header .sound-visualizer');
                if(!visualizer || Math.abs(middle(visualizer)-middle(document.querySelector('.page-actions')))>1) throw new Error('Visualizer should align with the header actions');
                const collections=document.querySelector('[aria-label="Open playlists"]').parentElement;
                if(!collections.textContent.includes('Collections') || collections.textContent.includes('Transfer & sync')) throw new Error('Playlists must have their own navigation group');
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
                const artworkToggle=[...document.querySelectorAll('[role="menuitemcheckbox"]')].find(item=>item.textContent.trim()==='Artwork');
                if(!artworkToggle) throw new Error('Artwork column toggle is missing');
                artworkToggle.click();
                await waitFor(()=>document.querySelector('td[data-column="artwork"] .cover'));
                if(document.querySelector('[aria-label="Sort by Artwork"]')) throw new Error('Artwork must not offer an invalid sort');
                const artworkSize=document.querySelector('td[data-column="artwork"] .cover').getBoundingClientRect().height;
                if(artworkSize<30 || artworkSize>36) throw new Error('Artwork thumbnail should be about 50% larger');
                const artworkRow=document.querySelector('[data-track-id]');
                if(artworkRow.getBoundingClientRect().height!==48) throw new Error('Artwork rows need enough vertical space');
                if(document.querySelector('th[data-column="title"]').getBoundingClientRect().width<document.querySelector('th[data-column="artwork"]').getBoundingClientRect().width*1.5) throw new Error('Artwork sizing squeezed the song title column');
                const artworkScroll=document.querySelector('.track-scroll');
                artworkScroll.scrollTop=artworkScroll.scrollHeight;
                await waitFor(()=>document.querySelector('[data-track-id="2300"]'));
                artworkToggle.click();
                await waitFor(()=>!document.querySelector('th[data-column="artwork"]'));
                artworkToggle.click();
                await waitFor(()=>document.querySelector('th[data-column="artwork"]'));
                artworkScroll.scrollTop=0;
                await waitFor(()=>document.querySelector('[data-track-id="1"]'));

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
                if(!document.querySelector('th[data-column="artwork"]')) throw new Error('Artwork visibility did not persist');

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
                if(document.querySelector('.library-hero [aria-label="Total duration"]').textContent.trim()!=='1 min') throw new Error('Duration does not reflect filtered songs');
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
                if(!document.querySelector('.album-dialog .library-stats').textContent.includes('1 artist')) throw new Error('Album dialog is missing artist counts');
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
                if(document.querySelector('h1').textContent!=='Albums') throw new Error('Starting playback must preserve the current page');
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
                await waitFor(()=>window.visualizerProbe.analyser?.context.state==='running');
                const playingArtwork=document.querySelector('[aria-label="Locate current song in library"]');
                playingArtwork.focus();
                if(getComputedStyle(playingArtwork).outlineStyle!=='none') throw new Error('Sidebar cover must not show a focus outline');
                const artworkBounds=playingArtwork.getBoundingClientRect();
                playingArtwork.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2,clientX:artworkBounds.x+10,clientY:artworkBounds.y+10}));
                await waitFor(()=>document.querySelector('[role="menu"]'));
                for(const label of ['Play now','Play next','Add to queue','Edit tags','Go to artist','Go to album','Show in folder','Copy file path']) {
                    if(!document.querySelector('[role="menu"]').textContent.includes(label)) throw new Error('Now-playing context menu is missing '+label);
                }
                document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
                await waitFor(()=>!document.querySelector('[role="menu"]'));
                                const signal=new Uint8Array(window.visualizerProbe.analyser.frequencyBinCount);
                await waitFor(()=>{window.visualizerProbe.analyser.getByteFrequencyData(signal);return signal.some(value=>value>0);});
                if(window.visualizerProbe.sources!==1) throw new Error('Playback must use one shared audio source');
                const shuffle=document.querySelector('.player-bar [aria-label="Shuffle"]');
                shuffle.click();
                await waitFor(()=>shuffle.getAttribute('aria-pressed')==='true');
                await frame();
                if(getComputedStyle(shuffle).backgroundColor!=='rgba(0, 0, 0, 0)' || getComputedStyle(shuffle).boxShadow!=='none') throw new Error('Shuffle must color only its icon');
                shuffle.click();
                await waitFor(()=>shuffle.getAttribute('aria-pressed')==='false');

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
                document.querySelector('[aria-label="Reset Title"]').click();
                await waitFor(()=>document.getElementById('tag-title').value==='Silence');
                if(!button('Choose image')) throw new Error('Local artwork picker is missing');
                button('Find online').click();
                await waitFor(()=>document.querySelector('[aria-label="Use cover: Album 000 by Fixture artist"]'));
                document.querySelector('[aria-label="Use cover: Album 000 by Fixture artist"]').click();
                await waitFor(()=>!button('Use selected cover').disabled);
                button('Use selected cover').click();
                await waitFor(()=>!document.querySelector('.cover-picker'));
                if(button('Save').disabled || !document.querySelector('.tag-summary img')) throw new Error('Online artwork was not applied to the tag editor');
                document.querySelector('[aria-label="Reset artwork"]').click();
                await waitFor(()=>button('Save').disabled);
                button('Find online').click();
                await waitFor(()=>document.querySelector('[aria-label="Use cover: Album 000 by Fixture artist"]'));
                document.querySelector('[aria-label="Use cover: Album 000 by Fixture artist"]').click();
                await waitFor(()=>!button('Use selected cover').disabled);
                button('Use selected cover').click();
                await waitFor(()=>!document.querySelector('.cover-picker'));
                button('Save').click();
                await waitFor(()=>!document.querySelector('.tag-editor'));
                const saved=await window.btunes.rpc('library.get',undefined);
                if(!saved.tracks.find(track=>track.id===1)?.cover) throw new Error('Online artwork did not persist');
            })()`, true);
            const savedMetadata = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', source], {encoding: 'utf8'}));
            if (!savedMetadata.streams.some(stream => stream.disposition?.attached_pic === 1)) throw new Error('Online artwork was not embedded in the audio file');
            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor,button,visible,frame}=window.uiReview;
                const audio=document.querySelector('audio');
                const viewport=document.querySelector('.track-scroll');
                const pause=async()=>{audio.pause();await waitFor(()=>!document.querySelector('.play-toggle[aria-label="Pause"]'));};
                const resume=async()=>{await audio.play();await waitFor(()=>document.querySelector('.play-toggle[aria-label="Pause"]'));await frame();};
                document.querySelector('.track-table').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
                await waitFor(()=>!document.querySelector('[data-track-id][aria-selected="true"]'));
                document.activeElement?.blur();
                await pause();
                viewport.scrollTop=viewport.scrollHeight;
                await new Promise(resolve=>setTimeout(resolve,8100));
                await resume();
                await waitFor(()=>visible(document.querySelector('[data-track-id="1"]'),viewport));
                if(document.querySelector('[data-track-id][aria-selected="true"]')) throw new Error('Automatic following must preserve selection');
                viewport.scrollTop=viewport.scrollHeight;
                await waitFor(()=>!visible(document.querySelector('[data-track-id="1"]'),viewport));
                document.querySelector('.player-bar [aria-label="Next track"]').click();
                await waitFor(()=>visible(document.querySelector('[data-track-id="2"]'),viewport) && !audio.paused);
                if(document.querySelector('[data-track-id][aria-selected="true"]')) throw new Error('Track advancement changed selection');
                document.querySelector('.player-bar [aria-label="Previous track"]').click();
                await waitFor(()=>audio.src.endsWith('/1') && !audio.paused);
                await pause();
                viewport.scrollTop=viewport.scrollHeight;
                await waitFor(()=>document.querySelector('[data-track-id="2300"]'));
                document.querySelector('[data-track-id="2300"]').click();
                await waitFor(()=>document.querySelector('[data-track-id="2300"][aria-selected="true"]'));
                await resume();
                if(visible(document.querySelector('[data-track-id="1"]'),viewport)) throw new Error('Playback interrupted a song selection');
                document.querySelector('[data-track-id="2300"]').dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true}));
                await waitFor(()=>!document.querySelector('[data-track-id][aria-selected="true"]'));
                await pause();
                viewport.scrollTop=viewport.scrollHeight;
                viewport.dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaY:100}));
                await resume();
                if(visible(document.querySelector('[data-track-id="1"]'),viewport)) throw new Error('Playback interrupted recent song browsing');
                await pause();
                button('Albums').click();
                await resume();
                if(document.querySelector('h1').textContent!=='Albums') throw new Error('Playback must not navigate away from another page');
                button('Songs').click();
                await waitFor(()=>document.querySelector('.track-scroll'));
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
                const {waitFor,button,visible,frame}=window.uiReview;
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
                const progress=document.querySelector('[aria-label="Playback position"]');
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(progress,'15');
                progress.dispatchEvent(new Event('input',{bubbles:true}));
                await waitFor(()=>document.querySelector('audio').currentTime>=14.5);
                await frame();
                const fill=parseFloat(progress.style.getPropertyValue('--range-fill'));
                if(fill<24 || fill>30) throw new Error('Playback progress fill does not follow the seek position');
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
                const deviceSearch=document.querySelector('.sidebar [aria-label="Search your library"]');
                const searchDevices=value=>{
                    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(deviceSearch,value);
                    deviceSearch.dispatchEvent(new Event('input',{bubbles:true}));
                };
                searchDevices('No matching phone');
                await waitFor(()=>document.querySelector('.devices-page').textContent.includes('No devices match your search.'));
                if(document.querySelector('h1').textContent!=='Devices') throw new Error('Device search navigated to Songs');
                document.querySelector('[aria-label="Clear search"]').click();
                await waitFor(()=>[...document.querySelectorAll('[data-slot="card-title"]')].some(title=>title.textContent==='Fixture phone'));
                const storage=[...document.querySelectorAll('button')].find(item=>item.textContent.includes('Internal storage'));
                storage.click();
                await waitFor(()=>[...document.querySelectorAll('button')].some(item=>item.textContent.trim()==='Music'));
                button('Music').click();
                await waitFor(()=>!button('Compare with PC').disabled);
                button('Compare with PC').click();
                await waitFor(()=>button('Copy missing songs') && !button('Copy missing songs').disabled);
                if(!document.querySelector('.devices-page').textContent.includes('Missing on phone')) throw new Error('Phone comparison did not render');
                const page=document.querySelector('.device-content');
                if(page.scrollHeight<=page.clientHeight) throw new Error('Device content must scroll vertically');
                for(const card of page.querySelectorAll('[data-slot="card"]')) {
                    if(card.scrollHeight>card.clientHeight+1) throw new Error('Device card contents are clipped');
                }
                page.scrollTop=page.scrollHeight;
                await waitFor(()=>visible(button('Copy missing songs'),page));
                if(!visible(document.querySelector('.devices-page .page-header'),document.querySelector('main'))) throw new Error('Device header scrolled out of view');
            })()`, true);
            await capture("devices-scrolled");
            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor,button,frame}=window.uiReview;
                document.querySelector('[aria-label="Open playlists"]').click();
                await waitFor(()=>document.querySelector('.playlist-browser'));
                if(document.querySelector('nav[aria-label="Library navigation"]')) throw new Error('Playlists did not get a dedicated sidebar');
                const smart=button('Jazz focus');
                if(!smart.querySelector('[aria-label="Smart playlist"]')) throw new Error('Smart playlist brain icon is missing');
                smart.click();
                await waitFor(()=>document.querySelector('h1').textContent==='Jazz focus');
                document.querySelector('[aria-label="Create playlist"]').click();
                await waitFor(()=>document.getElementById('playlist-name'));
                const setName=value=>{
                    const input=document.getElementById('playlist-name');
                    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);
                    input.dispatchEvent(new Event('input',{bubbles:true}));
                };
                setName('Sidebar test');
                await waitFor(()=>!button('Create playlist').disabled);
                button('Create playlist').click();
                await waitFor(()=>!document.querySelector('.playlist-dialog') && document.querySelector('h1').textContent==='Sidebar test');
                const contextMenu=async(label)=>{
                    const entry=button(label);
                    const bounds=entry.getBoundingClientRect();
                    entry.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2,clientX:bounds.x+40,clientY:bounds.y+10}));
                    await waitFor(()=>document.querySelector('[role="menu"]'));
                };
                await contextMenu('Sidebar test');
                [...document.querySelectorAll('[role="menuitem"]')].find(item=>item.textContent.trim()==='Edit playlist').click();
                await waitFor(()=>document.getElementById('playlist-name'));
                setName('Renamed sidebar test');
                button('Save playlist').click();
                await waitFor(()=>!document.querySelector('.playlist-dialog') && button('Renamed sidebar test'));
                await contextMenu('Renamed sidebar test');
                [...document.querySelectorAll('[role="menuitem"]')].find(item=>item.textContent.trim()==='Delete playlist').click();
                await waitFor(()=>button('Delete playlist'));
                button('Delete playlist').click();
                await waitFor(()=>!document.querySelector('[role="dialog"]') && !button('Renamed sidebar test'));
                const library=await window.btunes.rpc('library.get',undefined);
                if(library.tracks.length!==2300 || library.playlists.some(item=>item.name.includes('sidebar test'))) throw new Error('Playlist CRUD did not preserve library contents');
                await frame();
                if(document.querySelector('.content [role="alert"]')) throw new Error('Deleting the active playlist left an error banner');
                document.querySelector('.playlist-browser').querySelector('button').click();
                await waitFor(()=>document.querySelector('nav[aria-label="Library navigation"]'));
                document.querySelector('[aria-label="Hide now-playing artwork"]').click();
                await waitFor(()=>!document.getElementById('sidebar-playing-details'));
                document.querySelector('[aria-label="Show now-playing artwork"]').click();
                await waitFor(()=>document.querySelector('#sidebar-playing-details .cover'));
            })()`, true);

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
                button('Appearance').click();
                await waitFor(()=>document.getElementById('visualizer-style'));
                const chooseStyle=async(label,value)=>{
                    document.getElementById('visualizer-style').click();
                    await waitFor(()=>document.querySelector('[role="option"]'));
                    [...document.querySelectorAll('[role="option"]')].find(item=>item.textContent.trim()===label).click();
                    await waitFor(()=>JSON.parse(localStorage.getItem('btunes.appearance.v1')).visualizer===value);
                };
                const audio=document.querySelector('audio');
                const wasPaused=audio.paused;
                await chooseStyle('Orbit','orbit');
                await waitFor(()=>document.querySelector('.sound-visualizer[data-style="orbit"]'));
                await chooseStyle('Off','off');
                await waitFor(()=>!document.querySelector('.sound-visualizer'));
                await chooseStyle('Waveform','waveform');
                await waitFor(()=>document.querySelector('.sound-visualizer[data-style="waveform"]'));
                if(audio.paused!==wasPaused || window.visualizerProbe.sources!==1) throw new Error('Visualizer settings interrupted or duplicated audio playback');
                document.getElementById('sidebar-artwork').click();
                await waitFor(()=>!document.getElementById('sidebar-playing-details'));
                button('Sidebar').click();
                await waitFor(()=>document.querySelector('[aria-label="Navigation"]'));
                await frame();
                const list=document.querySelector('[aria-label="Navigation"]');
                if(list.children.length+document.querySelector('[aria-label="Collections"]').children.length+document.querySelector('[aria-label="Transfer & sync"]').children.length!==document.querySelectorAll('nav[aria-label="Library navigation"] button').length) throw new Error('Sidebar settings must show every navigation item');
                if(list.scrollHeight>list.clientHeight+1) throw new Error('Sidebar navigation list should expand instead of scrolling');
                assertContrast(list.querySelector('li span'),4.5,'Sidebar order label');
                assertContrast(list.querySelector('button svg'),3,'Sidebar drag handle');
                const devicesHandle=document.querySelector('[aria-label="Move Devices tools"]');
                devicesHandle.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',altKey:true,bubbles:true}));
                await waitFor(()=>document.querySelector('[aria-label="Transfer & sync"] li span').textContent==='Devices');
                const navigationLabels=()=>[...document.querySelectorAll('nav[aria-label="Library navigation"] button')].map(item=>item.textContent.trim());
                if(navigationLabels().indexOf('Devices')>navigationLabels().indexOf('Downloads')) throw new Error('Transfer ordering did not update the sidebar');
                devicesHandle.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',altKey:true,bubbles:true}));
                await frame();
                if(navigationLabels()[0]!=='Songs') throw new Error('Transfer items escaped their navigation group');
                devicesHandle.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',altKey:true,bubbles:true}));
                await waitFor(()=>document.querySelector('[aria-label="Transfer & sync"] li span').textContent==='Downloads');
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
                if(Math.abs(parseFloat(volume.style.getPropertyValue('--range-fill'))-23)>0.1) throw new Error('Volume fill must follow the saved level');
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
                if(!document.querySelector('.sound-visualizer[data-style="waveform"]')) throw new Error('Visualizer style did not persist after reopening');
                if(document.getElementById('sidebar-playing-details')) throw new Error('Sidebar artwork visibility did not persist after reopening');
                if(!document.querySelector('th[data-column="artwork"]')) throw new Error('Artwork column visibility did not persist after reopening');

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
