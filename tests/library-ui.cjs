const {app} = require("electron");
const {DatabaseSync} = require("node:sqlite");
const {readMigrationFiles} = require("drizzle-orm/migrator");
const {mkdtempSync, mkdirSync, rmSync, writeFileSync} = require("node:fs");
const {join} = require("node:path");
const {tmpdir} = require("node:os");
const {execFileSync} = require("node:child_process");

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
for (const migration of readMigrationFiles({migrationsFolder: join(__dirname, "../drizzle")})) {
    for (const statement of migration.sql) database.exec(statement);
}
database.exec("BEGIN");
const insert = database.prepare("INSERT INTO tracks (id,path,title,artist,album,genre,year,duration,size) VALUES (?,?,?,?,?,?,?,?,?)");
for (let index = 0; index < 2300; index++) {
    insert.run(index + 1, index ? join(music, "fixture-" + index + ".mp3") : source,
        index ? "Song " + String(index).padStart(4, "0") : "Silence",
        index ? "Artist " + String(index % 30).padStart(2, "0") : "Fixture artist", "Album " + String(Math.floor(index / 10)).padStart(3, "0"),
        index === 1 ? "Uncategorized" : index % 2 ? "Jazz" : "Ambient", 2000 + index % 25, 60, 10000);
}
database.prepare("INSERT INTO folders VALUES (?)").run(music);
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
}, 30000);

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
                window.uiReview = { waitFor, frame, button };
                await waitFor(() => document.querySelector('[data-track-id="1"]'));
                if(document.querySelector('h1')?.textContent!=='Songs') throw new Error('Songs must be the default view');
                if(document.querySelector('[aria-label="Play visible songs"]') || document.querySelector('.filter-controls')) throw new Error('Songs should not show collection play or filter controls');
                if(document.querySelector('.profile-avatar')) throw new Error('Decorative avatar remains');
                button('Albums').click();
                await waitFor(() => document.querySelectorAll('.album').length);
                const albumNodes = document.querySelectorAll('.album').length;
                if (albumNodes > 60) throw new Error("Albums are not virtualized");
                const snapshot = await window.btunes.rpc('library.get',undefined);
                if (snapshot.tracks.length !== 2300) throw new Error("Fixture must have 2300 tracks");
                const unchanged = await window.btunes.rpc('library.get',{revision:snapshot.revision});
                if (unchanged !== null) throw new Error("Unchanged library was retransmitted");
                if (button('Liked songs') || document.querySelector('.library-label')) throw new Error("Unwanted sidebar controls remain");
                if (button('Add music folder')) throw new Error("Folder controls must be in Settings");
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
                if(document.querySelector('.track-table .cover')) throw new Error('Song rows should not show cover art');
                if(document.querySelector('[data-track-id]').getBoundingClientRect().height>44.5) throw new Error('Song rows are not compact');
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
                setSearch('');
                await waitFor(()=>document.querySelector('.track-table')?.getAttribute('aria-rowcount')==='2301');
                scroll.scrollTop = 0;
                await waitFor(() => document.querySelector('[data-track-id="1"]'));
                const first = document.querySelector('[data-track-id="1"]');
                const rectangle = first.getBoundingClientRect();
                first.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2,clientX:rectangle.x+200,clientY:rectangle.y+30}));
                await waitFor(() => document.querySelector('[role="menu"]'));
                const menu = document.querySelector('[role="menu"]').textContent;
                for (const label of ['Play now','Play next','Add to queue','Edit tags','Add to playlist','Show in folder','Copy file path']) {
                    if (!menu.includes(label)) throw new Error("Missing context action: "+label);
                }
                return {songs:2300, mountedSongRows:songNodes, mountedAlbums:albumNodes};
            })()`, true);
            await capture("songs-context-menu");

            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor}=window.uiReview;
                document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
                await waitFor(()=>!document.querySelector('[role="menu"]'));
                window.uiReview.button('Albums').click();
                await waitFor(()=>document.querySelector('.album'));
                document.querySelector('[aria-label="Filter by genre"]').click();
                await waitFor(()=>document.querySelector('[role="listbox"]'));
            })()`, true);
            await capture("genre-dropdown");
            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor}=window.uiReview;
                [...document.querySelectorAll('[role="option"]')].find(item=>item.textContent.includes('Jazz')).click();
                await waitFor(()=>document.querySelector('[aria-label="Clear genre filter"]'));
                document.querySelector('[aria-label="Show all songs"]').click();
                await waitFor(()=>document.querySelector('.library-hero p').textContent.startsWith('2300 songs'));
                const artistInput=document.querySelector('[aria-label="Filter by artist"]');
                artistInput.focus();
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(artistInput,'Fixture');
                artistInput.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'Fixture'}));
                await waitFor(()=>document.querySelector('[role="option"]')?.textContent.includes('Fixture artist'));
            })()`, true);
            await capture("artist-dropdown");
            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor}=window.uiReview;
                [...document.querySelectorAll('[role="option"]')].find(item=>item.textContent.includes('Fixture artist')).click();
                await waitFor(()=>document.querySelector('.library-hero p').textContent.startsWith('1 songs'));
                document.querySelector('[aria-label="Show all songs"]').click();
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
                document.querySelector('.queue button').click();
                document.querySelector('[aria-label="Play Silence"]').click();
                const audio = document.querySelector('audio');
                await waitFor(() => !document.querySelector('[aria-label="Playback position"]').disabled);
                await audio.play();
                await waitFor(() => !audio.paused);
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
                [...document.querySelectorAll('[role="menuitem"]')].find(item=>item.textContent.trim()==='Edit tags').click();
                await waitFor(() => document.getElementById('tag-title'));
                await frame();
                const openTagEditorMs=Math.round(performance.now()-start);
                const input=document.getElementById('tag-title');
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Responsive while playing');
                input.dispatchEvent(new Event('input',{bubbles:true}));
                await frame();
                if(input.value!=='Responsive while playing' || button('Preview changes').disabled) throw new Error("Editor did not accept input during playback");
                if(audio.paused) throw new Error("Editing tags interrupted playback");
                return {openTagEditorMs, libraryMutationsDuringProgress:libraryMutations};
            })()`, true);
            await capture("tag-editor-playing");

            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor,button}=window.uiReview;
                button('Cancel').click();
                await waitFor(()=>!document.querySelector('[role="dialog"]'));
                button('Possible duplicates').click();
                await waitFor(()=>document.querySelector('[data-slot="empty-title"]')?.textContent==='No possible duplicates');
                const empty=document.querySelector('[data-slot="empty"]').textContent;
                if(empty.includes('playlist') || empty.includes('Add music folder')) throw new Error("Incorrect duplicates empty state");
            })()`, true);
            await capture("duplicates-empty");

            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor,button}=window.uiReview;
                button('Settings').click();
                await waitFor(()=>document.querySelector('h1')?.textContent==='Settings');
                if(document.querySelector('[role="dialog"]')) throw new Error('Settings should be a page');
                if(!button('Add music folder')) throw new Error("Settings does not expose folder management");
                if(!document.querySelector('.folder-list').textContent.includes('music')) throw new Error("Configured folder not shown");
            })()`, true);
            await capture("settings");

            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor,button}=window.uiReview;
                button('Back to music').click();
                await waitFor(()=>document.querySelector('h1')?.textContent==='Possible duplicates');
                button('Songs').click();
                await waitFor(()=>document.querySelector('[data-track-id="1"]'));
                const first=document.querySelector('[data-track-id="1"]');
                const rect=first.getBoundingClientRect();
                first.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2,clientX:rect.x+200,clientY:rect.y+30}));
                await waitFor(()=>document.querySelector('[role="menu"]'));
                [...document.querySelectorAll('[role="menuitem"]')].find(item=>item.textContent.trim()==='Go to artist').click();
                await waitFor(()=>document.querySelector('[aria-label="Show all songs"]'));
                if(document.querySelector('.track-table').getAttribute('aria-rowcount')!=='2') throw new Error('Artist filter did not apply');
                document.querySelector('[aria-label="Show all songs"]').click();
                await waitFor(()=>document.querySelector('.track-table').getAttribute('aria-rowcount')==='2301');
            })()`, true);

            await win.webContents.executeJavaScript(`(async () => {
                const {waitFor,button}=window.uiReview;
                const menuFor=async target=>{
                    const rect=target.getBoundingClientRect();
                    target.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,button:2,clientX:rect.x+80,clientY:rect.y+15}));
                    await waitFor(()=>document.querySelector('[role="menu"]'));
                };
                await menuFor(button('Road trip'));
                [...document.querySelectorAll('[role="menuitem"]')].find(item=>item.textContent.trim()==='Edit playlist').click();
                await waitFor(()=>document.getElementById('playlist-name'));
                const input=document.getElementById('playlist-name');
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Weekend mix');
                input.dispatchEvent(new Event('input',{bubbles:true}));
                button('Save playlist').click();
                await waitFor(()=>button('Weekend mix') && !document.querySelector('[role="dialog"]'));
                button('Weekend mix').click();
                await waitFor(()=>document.querySelector('h1')?.textContent==='Weekend mix');
                await menuFor(button('Weekend mix'));
                [...document.querySelectorAll('[role="menuitem"]')].find(item=>item.textContent.trim()==='Delete playlist').click();
                await waitFor(()=>document.querySelector('[role="dialog"]'));
                [...document.querySelectorAll('[role="dialog"] button')].find(item=>item.textContent.trim()==='Delete playlist').click();
                await waitFor(()=>!button('Weekend mix') && document.querySelector('h1')?.textContent==='Songs');
                const snapshot=await window.btunes.rpc('library.get',undefined);
                if(snapshot.tracks.length!==2300 || snapshot.playlists.length) throw new Error('Playlist deletion damaged library state');
            })()`, true);

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
