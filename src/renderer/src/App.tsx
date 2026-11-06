import {DownloadsPage} from "@/components/downloads/downloads-page";
import {DevicesPage} from "@/components/devices/devices-page";
import {SongDropZone} from "@/components/library/song-drop-zone";
import {useMouseNavigation} from "@/hooks/use-mouse-navigation";
import type {OpenedCollection} from "@/types/collection";
import {useItemReveal} from "@/hooks/use-item-reveal";
import {albumKey, getAlbumArtist} from "@/lib/music";
import {useEffect, useState} from "react";
import {usePlayer} from "@/hooks/use-player";
import {Button} from "@/components/ui/button";
import {useLibrary} from "@/hooks/use-library";
import {TagEditor} from "@/components/tag-editor";
import {Sidebar} from "@/components/library/sidebar";
import {useCollection} from "@/hooks/use-collection";
import type {Track} from "../../shared/types/library";
import {SettingsPage} from "@/components/settings-page";
import type {TrackActions} from "@/types/track-actions";
import {PlayerBar} from "@/components/player/player-bar";
import {FilterBar} from "@/components/library/filter-bar";
import {AlbumGrid} from "@/components/library/album-grid";
import {QueuePanel} from "@/components/player/queue-panel";
import {ArtistGrid} from "@/components/library/artist-grid";
import {TrackTable} from "@/components/library/track-table";
import {useSidebarLayout} from "@/hooks/use-sidebar-layout";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {TrackCollectionDialog} from "@/components/library/track-collection-dialog";
import {LibraryStats} from "@/components/library/library-stats";
import {LibrarySearch} from "@/components/library/library-search";
import {CollectionEmptyState} from "@/components/library/collection-empty-state";
import type {SettingsTab} from "@/types/settings";


export function App() {
    const library = useLibrary();
    const locator = useItemReveal();
    const player = usePlayer(library.setError);
    const [editing, setEditing] = useState<Track[]>();
    const [showQueue, setShowQueue] = useState(false);
    const [settingsTab, setSettingsTab] = useState<SettingsTab>("library");
    const sidebarLayout = useSidebarLayout(library.data.playlists);
    const [openedCollection, setOpenedCollection] = useState<OpenedCollection>();
    const collection = useCollection(library.data, library.reportError);

    const { audio: audioRef } = player;
    const {
        view, search, artist, sort, selected, tracks, albums, genres, activePlaylist, title,
        setSearch, setArtist, setSort, setSelected, navigate, goBack, goForward, clearSearch, showArtist, clearFilters,
    } = collection;

    useEffect(() => {
        if (library.ready) {
            document.getElementById("startup")?.remove();
        }
    }, [library.ready]);

    const openedCollectionIds = new Set(openedCollection?.ids);
    const openedCollectionTracks = library.data.tracks.filter((track) => openedCollectionIds.has(track.id));
    const current = library.data.tracks.find((track) => track.id === player.currentTrack?.id) ?? player.currentTrack;

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

    useMouseNavigation(goBack, goForward);

    const renderCollection = () => {
        if (!tracks.length) {
            return <CollectionEmptyState
                view={view}
                onClearFilters={clearFilters}
                hasFilters={Boolean(search || artist)}
                hasTracks={Boolean(library.data.tracks.length)}
                hasFolders={Boolean(library.data.folders.length)}
                onSettings={() => showSettings()}
            />;
        }

        if (view === "albums") {
            return (
                <AlbumGrid
                    currentTrack={current}
                    reveal={locator.target}
                    onRevealed={locator.clear}
                    albums={albums}
                    actions={actions}
                    playlists={library.data.playlists}
                    onOpen={(tracks) => setOpenedCollection({ ids: tracks.map((track) => track.id) })}
                />
            );
        }

        if (view === "artists") {
            return (
                <ArtistGrid
                    tracks={tracks}
                    currentTrack={current}
                    reveal={locator.target}
                    onRevealed={locator.clear}
                    onArtist={(name) => setOpenedCollection({
                        artistName: name,
                        ids: library.data.tracks.filter((track) => getAlbumArtist(track) === name).map((track) => track.id)
                    })}
                />
            );
        }

        return (
            <TrackTable
                reveal={locator.target}
                onRevealed={locator.clear}
                sort={sort}
                tracks={tracks}
                onSort={setSort}
                actions={actions}
                selected={selected}
                onSelect={setSelected}
                currentId={current?.id}
                playing={player.playing}
                playlists={library.data.playlists}
            />
        );
    };

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
            />

            <main className="isolate overflow-hidden min-w-0 rounded-xl border border-border/50 bg-background flex flex-col">
                {view !== "settings" && (
                    <header
                        className="topbar h-[72px] flex items-center gap-5 py-0 px-6 sticky top-0 bg-background
                    z-[1] shrink-0 max-[1150px]:py-0"
                    >
                        <LibrarySearch
                            value={search}
                            onClear={clearSearch}
                            onChange={(value) => {
                                if (view === "settings" || view === "android") navigate("tracks");
                                setSearch(value);
                            }}
                        />
                    </header>
                )}
                {view === "settings" ?
                    <SettingsPage
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
                        onRefresh={() => void library.reconcile()
                            .catch(library.reportError)
                        }
                    />
                    :
                    <>
                        <div className="library-hero shrink-0 border-b border-border/60 px-6 pt-2 pb-6">
                            <h1 className="mb-2 text-3xl leading-tight font-semibold tracking-[-0.04em]">
                                {title}
                            </h1>
                            {view === "android" || view === "downloads" ?
                                <p className="text-xs text-muted-foreground">
                                    {view === "downloads" ? "Download songs from bookmarks" : "USB music sync"}
                                </p>
                                :
                                <LibraryStats
                                    tracks={tracks}
                                />
                            }
                        </div>
                        <div className="content py-5 px-6 flex flex-col min-h-0 flex-1 overflow-hidden">
                            {library.error &&
                                <Alert variant="destructive">
                                    <AlertDescription>
                                        {library.error}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => library.setError("")}
                                        >
                                            Dismiss
                                        </Button>
                                    </AlertDescription>
                                </Alert>
                            }
                            {library.notice &&
                                <p
                                    role="status"
                                    className="notice text-primary text-xs mb-5 [overflow-wrap:anywhere] shrink-0 max-h-16 overflow-auto"
                                >
                                    {library.notice}
                                </p>
                            }
                            {view === "downloads" ? (
                                <DownloadsPage
                                    query={search}
                                    genres={genres}
                                    onSettings={() => showSettings("downloads")}
                                    onSaved={library.refresh}
                                />
                            ) : view === "android" ?
                                <DevicesPage/>
                                :
                                <>
                                    <FilterBar
                                        artist={artist}
                                        search={search}
                                        onArtist={setArtist}
                                        onClear={clearFilters}
                                    />
                                    <div className="collection-results min-h-0 flex-1 flex flex-col">
                                        {view === "tracks" ? (
                                            <SongDropZone
                                                onImported={async () => {
                                                    clearFilters();
                                                    await library.refresh();
                                                }}
                                                onError={library.reportError}
                                            >
                                                {renderCollection()}
                                            </SongDropZone>
                                        ) : renderCollection()}
                                    </div>
                                    {view === "duplicates" && !!tracks.length &&
                                        <p className="muted text-muted-foreground duplicate-note shrink-0 mt-[14px] mx-2 mb-0 text-xs">
                                            Matches use title, artist, and rounded duration. No files are deleted.
                                        </p>
                                    }
                                </>
                            }
                        </div>
                    </>
                }
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
            <audio
                ref={audioRef}
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
