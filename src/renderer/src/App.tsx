import {usePlayer} from "@/hooks/use-player";
import {Button} from "@/components/ui/button";
import {useLibrary} from "@/hooks/use-library";
import {useEffect, useRef, useState} from "react";
import {TagEditor} from "@/components/tag-editor";
import type {SettingsTab} from "@/types/settings";
import {Sidebar} from "@/components/library/sidebar";
import {useAppearance} from "@/hooks/use-appearance";
import {useCollection} from "@/hooks/use-collection";
import {albumKey, getAlbumArtist} from "@/lib/music";
import {useAppUpdates} from "@/hooks/use-app-updates";
import {useItemReveal} from "@/hooks/use-item-reveal";
import type {Track} from "../../shared/types/library";
import {SettingsPage} from "@/components/settings-page";
import type {TrackActions} from "@/types/track-actions";
import {PlayerBar} from "@/components/player/player-bar";
import type {OpenedCollection} from "@/types/collection";
import {useMediaSession} from "@/hooks/use-media-session";
import {QueuePanel} from "@/components/player/queue-panel";
import {useAudioAnalyser} from "@/hooks/use-audio-analyser";
import {useSidebarLayout} from "@/hooks/use-sidebar-layout";
import {DevicesPage} from "@/components/devices/devices-page";
import {LibraryPage} from "@/components/library/library-page";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {usePlaybackFollow} from "@/hooks/use-playback-follow";
import {useMouseNavigation} from "@/hooks/use-mouse-navigation";
import {LibrarySearch} from "@/components/library/library-search";
import {DownloadsPage} from "@/components/downloads/downloads-page";
import {UpdateNotification} from "@/components/update-notification";
import {SoundVisualizer} from "@/components/player/sound-visualizer";
import {TrackCollectionDialog} from "@/components/library/track-collection-dialog";


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

    useMediaSession(player, current);

    const visualizer = appearance.visualizer !== "off"
        ? (
            <SoundVisualizer
                analyser={analyser}
                playing={player.playing}
                style={appearance.visualizer}
            />
        )
        : undefined;
    const searchControl = (
        <LibrarySearch
            scope={view}
            value={search}
            onChange={setSearch}
            onClear={clearSearch}
        />
    );

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

    const feedback = (
        <>
            {library.error && (
                <Alert variant="destructive">
                    <AlertDescription>
                        {library.error}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => library.setError("")}
                        >
                            Dismiss
                        </Button>
                    </AlertDescription>
                </Alert>
            )}
            {library.notice && (
                <p
                    role="status"
                    className="notice mb-5 max-h-16 shrink-0 overflow-auto text-xs text-primary [overflow-wrap:anywhere]"
                >
                    {library.notice}
                </p>
            )}
        </>
    );

    function renderPage() {
        if (view === "settings") {
            return (
                <SettingsPage
                    updates={updates}
                    tab={settingsTab}
                    analyser={analyser}
                    busy={library.busy}
                    error={library.error}
                    appearance={appearance}
                    notice={library.notice}
                    playing={player.playing}
                    onTabChange={setSettingsTab}
                    sidebarLayout={sidebarLayout}
                    folders={library.data.folders}
                    onAppearanceChange={setAppearance}
                    playlists={library.data.playlists}
                    songCount={library.data.tracks.length}
                    onImport={() => void library.importFolder()}
                    onRefresh={() => void library.reconcile().catch(library.reportError)}
                />
            );
        }

        if (view === "android" || view === "downloads") {
            return (
                <div className="content flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-3 pt-5">
                    {feedback}
                    {view === "downloads" ? (
                        <DownloadsPage
                            query={search}
                            genres={genres}
                            visualizer={visualizer}
                            onSaved={library.refresh}
                            searchControl={searchControl}
                            onSettings={() => showSettings("downloads")}
                        />
                    ) : (
                        <DevicesPage
                            query={search}
                            visualizer={visualizer}
                            searchControl={searchControl}
                        />
                    )}
                </div>
            );
        }

        return (
            <LibraryPage
                current={current}
                actions={actions}
                data={library.data}
                feedback={feedback}
                collection={collection}
                reveal={locator.target}
                onPlay={playCollection}
                visualizer={visualizer}
                playing={player.playing}
                onRevealed={locator.clear}
                onImported={library.refresh}
                searchControl={searchControl}
                onSettings={() => showSettings()}
                onOpenAlbum={(tracks) => setOpenedCollection({ ids: tracks.map((track) => track.id) })}
                onOpenArtist={(name) => setOpenedCollection({
                    artistName: name,
                    ids: library.data.tracks.filter((track) => getAlbumArtist(track) === name).map((track) => track.id),
                })}
            />
        );
    }

    return (
        <div
            className="app-shell grid grid-cols-[232px_minmax(0,_1fr)] grid-rows-[minmax(0,_1fr)_98px] h-[100vh] gap-2 pt-2 px-2 pb-0
            overflow-hidden max-[1150px]:grid-cols-[210px_minmax(0,_1fr)]"
        >
            <Sidebar
                view={view}
                genres={genres}
                current={current}
                data={library.data}
                onNavigate={navigate}
                layout={sidebarLayout}
                onReveal={revealPlaying}
                onRefresh={library.refresh}
                onError={library.reportError}
                onSettings={() => showSettings()}
                artworkExpanded={appearance.sidebarArtwork}
                actions={{ ...actions, onRemove: undefined }}
                onArtworkToggle={() => setAppearance({ ...appearance, sidebarArtwork: !appearance.sidebarArtwork })}
            />
            <main
                ref={main}
                className="isolate overflow-hidden min-w-0 rounded-xl border border-border bg-background flex flex-col"
            >
                {renderPage()}
            </main>
            {showQueue && (
                <QueuePanel
                    player={player}
                    onClose={() => setShowQueue(false)}
                />
            )}
            <PlayerBar
                player={player}
                current={current}
                queueOpen={showQueue}
                onReveal={revealPlaying}
                onQueue={() => setShowQueue(!showQueue)}
            />
            {openedCollectionTracks.length > 0 && (
                <TrackCollectionDialog
                    genres={genres}
                    actions={actions}
                    currentId={current?.id}
                    playing={player.playing}
                    onSaved={library.refresh}
                    tracks={openedCollectionTracks}
                    playlists={library.data.playlists}
                    artistName={openedCollection?.artistName}
                    onClose={() => setOpenedCollection(undefined)}
                    key={openedCollection?.artistName ?? albumKey(openedCollectionTracks[0])}
                />
            )}
            {editing && (
                <TagEditor
                    genres={genres}
                    tracks={editing}
                    onSaved={library.refresh}
                    onClose={() => setEditing(undefined)}
                    key={editing.map((track) => track.id).join(",")}
                />
            )}
            <UpdateNotification
                updates={updates}
                blocked={Boolean(editing || openedCollectionTracks.length)}
            />
            <audio
                ref={audioRef}
                onEnded={player.ended}
                crossOrigin="anonymous"
                onTimeUpdate={player.updateTime}
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
