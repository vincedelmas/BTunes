import {useEffect, useState} from "react";
import {LibrarySearch} from "@/components/library/library-search";
import {Badge} from "@/components/ui/badge";
import {usePlayer} from "@/hooks/use-player";
import {Button} from "@/components/ui/button";
import {useLibrary} from "@/hooks/use-library";
import {TagEditor} from "@/components/tag-editor";
import {EmptyState} from "@/components/empty-state";
import {Sidebar} from "@/components/library/sidebar";
import {useSidebarLayout} from "@/hooks/use-sidebar-layout";
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
import {Alert, AlertDescription} from "@/components/ui/alert";
import {ArrowLeft, Smartphone} from "lucide-react";
import {CollectionEmptyState} from "@/components/library/collection-empty-state";


export function App() {
    const library = useLibrary();
    const player = usePlayer(library.setError);
    const sidebarLayout = useSidebarLayout(library.data.playlists);
    const [editing, setEditing] = useState<Track[]>();
    const [showQueue, setShowQueue] = useState(false);
    const collection = useCollection(library.data, library.reportError);

    const { audio: audioRef } = player;
    const {
        view, search, genre, artist, sort, selected, tracks, albums, genres, artists, activePlaylist, title,
        setSearch, setGenre, setArtist, setSort, setSelected, navigate, showArtist, clearFilters, returnToMusic,
    } = collection;

    useEffect(() => {
        if (library.ready) document.getElementById("startup")?.remove();
    }, [library.ready]);

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

    const tagsSaved = async (message: string) => {
        await library.refresh();
        library.setNotice(message);
    };

    const renderCollection = () => {
        if (!tracks.length) {
            return <CollectionEmptyState
                view={view}
                onClearFilters={clearFilters}
                hasTracks={Boolean(library.data.tracks.length)}
                hasFilters={Boolean(search || genre || artist)}
                hasFolders={Boolean(library.data.folders.length)}
                onSettings={() => navigate("settings")}
            />;
        }

        if (view === "albums") {
            return (
                <AlbumGrid
                    albums={albums}
                    actions={actions}
                    playlists={library.data.playlists}
                />
            );
        }

        if (view === "artists") {
            return (
                <ArtistGrid
                    tracks={tracks}
                    onArtist={showArtist}
                />
            );
        }

        return (
            <TrackTable
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
            className="app-shell grid grid-cols-[248px_minmax(0,_1fr)] grid-rows-[minmax(0,_1fr)_98px] h-[100vh] gap-2 pt-2 px-2 pb-0 overflow-hidden max-[1150px]:grid-cols-[210px_minmax(0,_1fr)]">
            <Sidebar
                layout={sidebarLayout}
                view={view}
                genres={genres}
                data={library.data}
                onNavigate={navigate}
                onRefresh={library.refresh}
                onError={library.reportError}
                onSettings={() => navigate("settings")}
            />
            <main className="overflow-hidden min-w-0 rounded-lg bg-background flex flex-col">
                <header
                    className="topbar h-14 flex items-center gap-5 py-0 px-7 sticky top-0 bg-[#121212f2] backdrop-[blur(20px)] z-[1] shrink-0 max-[1150px]:py-0 max-[1150px]:px-5">
                    {view === "settings" ?
                        <Button
                            variant="ghost"
                            onClick={returnToMusic}
                        >
                            <ArrowLeft/>Back to music
                        </Button>
                        :
                        <>
                            <LibrarySearch
                                value={search}
                                onChange={setSearch}
                            />
                        </>
                    }
                </header>
                {view === "settings" ?
                    <SettingsPage
                        sidebarLayout={sidebarLayout}
                        playlists={library.data.playlists}
                        busy={library.busy}
                        error={library.error}
                        notice={library.notice}
                        folders={library.data.folders}
                        songCount={library.data.tracks.length}
                        onImport={() => void library.importFolder()}
                        onRefresh={() => void library.refresh()
                            .then(() => library.setNotice("Library refreshed."))
                            .catch(library.reportError)
                        }
                    />
                    :
                    <>
                        <div
                            className="library-hero py-[14px] px-6 [background:linear-gradient(145deg,_#293c32,_#1e2b25_42%,_#191c1a)] shrink-0 [&_h1]:text-[clamp(28px,_3vw,_36px)] [&_h1]:font-[850] [&_h1]:tracking-[-1.4px] [&_h1]:leading-[1.1] [&_h1]:mt-0 [&_h1]:mx-0 [&_h1]:mb-[6px] [&_>_p:last-child]:text-[#d0d5d1] [&_>_p:last-child]:text-xs [&_>_p:last-child]:m-0 [&_p_span]:my-0 [&_p_span]:mx-[7px]">
                            <h1>{title}</h1>
                            <p>{tracks.length} songs <span>•</span> {albums.length} albums</p>
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
                                    title="Take your music with you"
                                    description="Compare your computer and phone, find missing songs, and sync over USB or KDE Connect."
                                >
                                    <Badge variant="secondary">
                                        Coming next
                                    </Badge>
                                </EmptyState>
                                :
                                <>
                                    <FilterBar
                                        sort={sort}
                                        genre={genre}
                                        artist={artist}
                                        search={search}
                                        genres={genres}
                                        onSort={setSort}
                                        artists={artists}
                                        onGenre={setGenre}
                                        onArtist={setArtist}
                                        onClear={clearFilters}
                                        showControls={view !== "tracks"}
                                        showSort={view === "albums" || view === "artists"}
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
                onQueue={() => setShowQueue(!showQueue)}
            />
            {editing &&
                <TagEditor
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
