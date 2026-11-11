import {useEffect, useRef, useState} from "react";

import {DevicesPage} from "@/components/devices/devices-page";
import {DownloadsPage} from "@/components/downloads/downloads-page";
import {LibrarySearch} from "@/components/library/library-search";
import {LibraryPage} from "@/components/library/library-page";
import {Sidebar} from "@/components/library/sidebar";
import {TrackCollectionDialog} from "@/components/library/track-collection-dialog";
import {PlayerBar} from "@/components/player/player-bar";
import {QueuePanel} from "@/components/player/queue-panel";
import {SoundVisualizer} from "@/components/player/sound-visualizer";
import {SettingsPage} from "@/components/settings-page";
import {TagEditor} from "@/components/tag-editor";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Button} from "@/components/ui/button";
import {UpdateNotification} from "@/components/update-notification";

import {useAppUpdates} from "@/hooks/use-app-updates";
import {useAppearance} from "@/hooks/use-appearance";
import {useAudioAnalyser} from "@/hooks/use-audio-analyser";
import {useCollection} from "@/hooks/use-collection";
import {useItemReveal} from "@/hooks/use-item-reveal";
import {useLibrary} from "@/hooks/use-library";
import {useMouseNavigation} from "@/hooks/use-mouse-navigation";
import {usePlaybackFollow} from "@/hooks/use-playback-follow";
import {usePlayer} from "@/hooks/use-player";
import {useSidebarLayout} from "@/hooks/use-sidebar-layout";

import {albumKey, getAlbumArtist} from "@/lib/music";

import type {Track} from "../../shared/types/library";
import type {OpenedCollection} from "@/types/collection";
import type {SettingsTab} from "@/types/settings";
import type {TrackActions} from "@/types/track-actions";


export function App() {
    const main = useRef<HTMLElement>(null);
    const library = useLibrary();
    const updates = useAppUpdates();
    const locator = useItemReveal();
    const player = usePlayer(library.setError);
    const [appearance, setAppearance] = useAppearance();
    const analyser = useAudioAnalyser(player.audio, appearance.visualizer !== "off");
    const [editing, setEditing] = useState<Track[]>();
    const [showQueue, setShowQueue] = useState(false);
    const [settingsTab, setSettingsTab] = useState<SettingsTab>("library");
    const sidebarLayout = useSidebarLayout(library.data.playlists);
    const [openedCollection, setOpenedCollection] = useState<OpenedCollection>();
    const collection = useCollection(library.data, library.reportError);

    const { audio: audioRef } = player;
    const {
        view, search, artist, selected, tracks, genres, activePlaylist,
        setSearch, navigate, goBack, goForward, clearSearch, showArtist, clearFilters,
    } = collection;

    useEffect(() => {
        if (library.ready) {
            document.getElementById("startup")?.remove();
        }
    }, [library.ready]);

    const openedCollectionIds = new Set(openedCollection?.ids);
    const openedCollectionTracks = openedCollection
        ? library.data.tracks.filter((track) => openedCollectionIds.has(track.id))
        : [];
    const current = library.data.tracks.find((track) => track.id === player.currentTrack?.id) ?? player.currentTrack;
    const visualizer = appearance.visualizer !== "off"
        ? <SoundVisualizer analyser={analyser} style={appearance.visualizer} playing={player.playing}/>
        : undefined;
    const searchControl = <LibrarySearch scope={view} value={search} onChange={setSearch} onClear={clearSearch}/>;

    const actions: TrackActions = {
        onEdit: setEditing,
        onArtist: showArtist,
        onAlbum: (track) => setOpenedCollection({
            ids: library.data.tracks.filter((item) => albumKey(item) === albumKey(track)).map((item) => item.id),
        }),
        onError: library.setError,
        onEnqueue: player.enqueue,
        onPlay: (track, list = tracks) => player.start(track, list),
        onAdd: (playlistId, trackIds) => void library.addToPlaylist(playlistId, trackIds),
        onRemove: activePlaylist && !activePlaylist.rule
            ? (trackIds) => void library.removeFromPlaylist(activePlaylist.id, trackIds)
            : undefined,
    };

    function showSettings(tab: SettingsTab = "library") {
        setSettingsTab(tab);
        navigate("settings");
    }

    function revealPlaying() {
        if (!current) return;

        const cardView = view === "albums" || view === "artists";
        const outsideLibrary = view === "settings" || view === "android" || view === "downloads";
        if (outsideLibrary || (!cardView && !tracks.some((track) => track.id === current.id))) navigate("tracks");

        clearFilters();
        let key: string | number = current.id;
        if (view === "albums") key = albumKey(current);
        if (view === "artists") key = getAlbumArtist(current);
        locator.show(key);
    }

    usePlaybackFollow(
        main,
        current?.id,
        player.playing,
        view !== "tracks" || Boolean(search || artist || selected.length || editing || openedCollection),
        (id) => locator.show(id, false),
    );

    useMouseNavigation(goBack, goForward);

    function playCollection(shuffle: boolean) {
        if (!tracks.length) return;

        player.setShuffle(shuffle);
        const index = shuffle ? Math.floor(Math.random() * tracks.length) : 0;
        player.start(tracks[index], tracks, index);
    }

    const feedback = <>
        {library.error && <Alert variant="destructive">
            <AlertDescription>
                {library.error}
                <Button variant="ghost" size="sm" onClick={() => library.setError("")}>Dismiss</Button>
            </AlertDescription>
        </Alert>}
        {library.notice && <p role="status" className="notice mb-5 max-h-16 shrink-0 overflow-auto text-xs text-primary [overflow-wrap:anywhere]">
            {library.notice}
        </p>}
    </>;

    function renderPage() {
        if (view === "settings") {
            return <SettingsPage
                appearance={appearance}
                analyser={analyser}
                playing={player.playing}
                onAppearanceChange={setAppearance}
                updates={updates}
                tab={settingsTab}
                onTabChange={setSettingsTab}
                busy={library.busy}
                error={library.error}
                notice={library.notice}
                sidebarLayout={sidebarLayout}
                folders={library.data.folders}
                playlists={library.data.playlists}
                songCount={library.data.tracks.length}
                onImport={() => void library.importFolder()}
                onRefresh={() => void library.reconcile().catch(library.reportError)}
            />;
        }

        if (view === "android" || view === "downloads") {
            return <div className="content flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-3 pt-5">
                {feedback}
                {view === "downloads" ? <DownloadsPage
                    visualizer={visualizer}
                    searchControl={searchControl}
                    query={search}
                    genres={genres}
                    onSettings={() => showSettings("downloads")}
                    onSaved={library.refresh}
                /> : <DevicesPage query={search} visualizer={visualizer} searchControl={searchControl}/>}
            </div>;
        }

        return <LibraryPage
            collection={collection}
            data={library.data}
            current={current}
            playing={player.playing}
            actions={actions}
            reveal={locator.target}
            onRevealed={locator.clear}
            onOpenAlbum={(tracks) => setOpenedCollection({ ids: tracks.map((track) => track.id) })}
            onOpenArtist={(name) => setOpenedCollection({
                artistName: name,
                ids: library.data.tracks.filter((track) => getAlbumArtist(track) === name).map((track) => track.id),
            })}
            onSettings={() => showSettings()}
            onImported={library.refresh}
            onPlay={playCollection}
            visualizer={visualizer}
            searchControl={searchControl}
            feedback={feedback}
        />;
    }

    return (
        <div
            className="app-shell grid grid-cols-[232px_minmax(0,_1fr)] grid-rows-[minmax(0,_1fr)_98px] h-[100vh] gap-2 pt-2 px-2 pb-0
            overflow-hidden max-[1150px]:grid-cols-[210px_minmax(0,_1fr)]"
        >
            <Sidebar
                view={view}
                genres={genres}
                data={library.data}
                onNavigate={navigate}
                layout={sidebarLayout}
                onRefresh={library.refresh}
                onError={library.reportError}
                onSettings={() => showSettings()}
                actions={{ ...actions, onRemove: undefined }}
                current={current}
                artworkExpanded={appearance.sidebarArtwork}
                onArtworkToggle={() => setAppearance({ ...appearance, sidebarArtwork: !appearance.sidebarArtwork })}
                onReveal={revealPlaying}
            />

            <main ref={main} className="isolate overflow-hidden min-w-0 rounded-xl border border-border bg-background flex flex-col">
                {renderPage()}
            </main>
            {showQueue &&
                <QueuePanel
                    player={player}
                    onClose={() => setShowQueue(false)}
                />
            }
            <PlayerBar
                player={player}
                current={current}
                onReveal={revealPlaying}
                queueOpen={showQueue}
                onQueue={() => setShowQueue(!showQueue)}
            />
            {openedCollectionTracks.length > 0 && <TrackCollectionDialog
                key={openedCollection?.artistName ?? albumKey(openedCollectionTracks[0])}
                artistName={openedCollection?.artistName}
                genres={genres}
                actions={actions}
                onSaved={library.refresh}
                currentId={current?.id}
                playing={player.playing}
                tracks={openedCollectionTracks}
                playlists={library.data.playlists}
                onClose={() => setOpenedCollection(undefined)}
            />}
            {editing &&
                <TagEditor
                    genres={genres}
                    key={editing.map((track) => track.id).join(",")}
                    tracks={editing}
                    onSaved={library.refresh}
                    onClose={() => setEditing(undefined)}
                />
            }
            <UpdateNotification
                updates={updates}
                blocked={Boolean(editing || openedCollectionTracks.length)}
            />
            <audio
                ref={audioRef}
                crossOrigin="anonymous"
                onTimeUpdate={player.updateTime}
                onEnded={player.ended}
                onPlay={() => player.setPlaying(true)}
                onPause={() => player.setPlaying(false)}
                src={player.currentTrack ? "btunes://audio/" + player.currentTrack.id : undefined}
                onError={() => {
                    if (player.currentTrack) {
                        library.setError("Unable to play this file. It may be missing or use an unsupported codec.");
                    }
                }}
            />
        </div>
    );
}
