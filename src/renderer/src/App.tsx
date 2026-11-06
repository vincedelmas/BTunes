import {useItemReveal} from "@/hooks/use-item-reveal";
import {albumKey, getAlbumArtist} from "@/lib/music";
import {useEffect, useEffectEvent, useState} from "react";
import {usePlayer} from "@/hooks/use-player";
import {Button} from "@/components/ui/button";
import {useLibrary} from "@/hooks/use-library";
import {TagEditor} from "@/components/tag-editor";
import {Smartphone} from "lucide-react";
import {EmptyState} from "@/components/empty-state";
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


export function App() {
    const library = useLibrary();
    const locator = useItemReveal();
    const player = usePlayer(library.setError);
    const [editing, setEditing] = useState<Track[]>();
    const [showQueue, setShowQueue] = useState(false);
    const sidebarLayout = useSidebarLayout(library.data.playlists);
    const [openedCollection, setOpenedCollection] = useState<{ ids: number[]; artistName?: string }>();
    const collection = useCollection(library.data, library.reportError);

    const { audio: audioRef } = player;
    const {
        view, search, artist, sort, selected, tracks, albums, genres, activePlaylist, title,
        setSearch, setArtist, setSort, setSelected, navigate, goBack, showArtist, clearFilters,
    } = collection;

    useEffect(() => {
        if (library.ready) {
            document.getElementById("startup")?.remove();
        }
    }, [library.ready]);

    const openedCollectionTracks = library.data.tracks.filter((track) => openedCollection?.ids.includes(track.id));
    const current = library.data.tracks.find((track) => track.id === player.currentTrack?.id) ?? player.currentTrack;

    const actions: TrackActions = {
        onEdit: setEditing,
        onArtist: showArtist,
        onError: library.setError,
        onEnqueue: player.enqueue,
        onPlay: (track, list = tracks) => player.start(track, list),
        onAdd: (playlistId, trackIds) => void library.addToPlaylist(playlistId, trackIds),
        onRemove: activePlaylist && !activePlaylist.rule
            ? (trackIds) => void library.removeFromPlaylist(activePlaylist.id, trackIds)
            : undefined,
    };

    function revealPlaying() {
        if (!current) return;

        const cardView = view === "albums" || view === "artists";
        const outsideLibrary = view === "settings" || view === "android";
        if (outsideLibrary || (!cardView && !tracks.some((track) => track.id === current.id))) navigate("tracks");

        clearFilters();
        let key: string | number = current.id;
        if (view === "albums") key = albumKey(current);
        if (view === "artists") key = getAlbumArtist(current);
        locator.show(key);
    }

    const handleMouseBack = useEffectEvent((ev: MouseEvent) => {
        if (ev.button !== 3) return;
        ev.preventDefault();
        const dialogs = document.querySelectorAll('[data-slot="dialog-content"]');
        const dialog = dialogs.item(dialogs.length - 1);
        if (dialog) {
            dialog.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')?.click();
            return;
        }
        goBack();
    });

    useEffect(() => {
        const preventBrowserBack = (ev: MouseEvent) => {
            if (ev.button === 3) ev.preventDefault();
        };
        const back = (ev: MouseEvent) => handleMouseBack(ev);
        window.addEventListener("mousedown", preventBrowserBack);
        window.addEventListener("mouseup", back);
        window.addEventListener("auxclick", preventBrowserBack);
        return () => {
            window.removeEventListener("mousedown", preventBrowserBack);
            window.removeEventListener("mouseup", back);
            window.removeEventListener("auxclick", preventBrowserBack);
        };
    }, []);

    const tagsSaved = async () => {
        await library.refresh();
    };

    const renderCollection = () => {
        if (!tracks.length) {
            return <CollectionEmptyState
                view={view}
                onClearFilters={clearFilters}
                hasFilters={Boolean(search || artist)}
                hasTracks={Boolean(library.data.tracks.length)}
                hasFolders={Boolean(library.data.folders.length)}
                onSettings={() => navigate("settings")}
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
            className="app-shell grid grid-cols-[248px_minmax(0,_1fr)] grid-rows-[minmax(0,_1fr)_98px] h-[100vh] gap-2 pt-2 px-2 pb-0
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
                onSettings={() => navigate("settings")}
            />

            <main className="isolate overflow-hidden min-w-0 rounded-lg bg-background flex flex-col">
                {view !== "settings" && (
                    <header
                        className="topbar h-14 flex items-center gap-5 py-0 px-7 sticky top-0 bg-[#121212f2] backdrop-[blur(20px)]
                    z-[1] shrink-0 max-[1150px]:py-0 max-[1150px]:px-5"
                    >
                        <LibrarySearch
                            value={search}
                            onChange={(value) => {
                                if (view === "settings" || view === "android") navigate("tracks");
                                setSearch(value);
                            }}
                        />
                    </header>
                )}
                {view === "settings" ?
                    <SettingsPage
                        busy={library.busy}
                        error={library.error}
                        notice={library.notice}
                        sidebarLayout={sidebarLayout}
                        folders={library.data.folders}
                        playlists={library.data.playlists}
                        songCount={library.data.tracks.length}
                        onImport={() => void library.importFolder()}
                        onRefresh={() => void library.refresh()
                            .then(() => library.setNotice("Library refreshed."))
                            .catch(library.reportError)
                        }
                    />
                    :
                    <>
                        <div className="library-hero shrink-0 bg-linear-to-br from-[#293c32] via-[#1e2b25] to-[#191c1a] px-6 py-3.5">
                            <h1 className="mb-1.5 text-[clamp(28px,3vw,36px)] leading-tight font-[850] tracking-tight">
                                {title}
                            </h1>
                            {view === "android" ?
                                <p className="text-xs text-muted-foreground">
                                    Android sync
                                </p>
                                :
                                <LibraryStats
                                    tracks={tracks}
                                />
                            }
                        </div>
                        <div className="content py-3 px-5 flex flex-col min-h-0 flex-1 overflow-hidden">
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
                            {view === "android" ?
                                <EmptyState
                                    icon={Smartphone}
                                    title="No device connected"
                                    description="Android sync is coming soon. Compare and transfer music over USB or KDE Connect when it’s available."
                                />
                                :
                                <>
                                    <FilterBar
                                        artist={artist}
                                        search={search}
                                        onArtist={setArtist}
                                        onClear={clearFilters}
                                    />
                                    <div className="collection-results min-h-0 flex-1 flex flex-col">
                                        {renderCollection()}
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
                onQueue={() => setShowQueue(!showQueue)}
            />
            {openedCollectionTracks.length > 0 && <TrackCollectionDialog
                artistName={openedCollection?.artistName}
                genres={genres}
                actions={actions}
                onSaved={tagsSaved}
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
                    onSaved={tagsSaved}
                    onClose={() => setEditing(undefined)}
                />
            }
            <audio
                ref={audioRef}
                onTimeUpdate={player.updateTime}
                onEnded={() => player.next()}
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
