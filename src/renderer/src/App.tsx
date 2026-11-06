import {useEffect, useState} from "react";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {usePlayer} from "@/hooks/use-player";
import {Button} from "@/components/ui/button";
import {useLibrary} from "@/hooks/use-library";
import {TagEditor} from "@/components/tag-editor";
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
import {Alert, AlertDescription} from "@/components/ui/alert";
import {ArrowLeft, Headphones, Search, Smartphone} from "lucide-react";
import {CollectionEmptyState} from "@/components/library/collection-empty-state";


export function App() {
    const library = useLibrary();
    const player = usePlayer(library.setError);
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
        <div className="app-shell">
            <Sidebar
                view={view}
                genres={genres}
                data={library.data}
                onNavigate={navigate}
                onRefresh={library.refresh}
                onError={library.reportError}
                onSettings={() => navigate("settings")}
            />
            <main>
                <header className="topbar">
                    {view === "settings" ?
                        <Button variant="ghost" onClick={returnToMusic}>
                            <ArrowLeft/>Back to music
                        </Button>
                        :
                        <>
                            <div className="page-context">
                                <Headphones size={20}/>
                                <span>Music</span>
                            </div>
                            <div className="search">
                                <Search size={21} aria-hidden="true"/>
                                <Input
                                    value={search}
                                    aria-label="Search your library"
                                    placeholder="Search songs, artists, albums"
                                    onChange={(ev) => setSearch(ev.target.value)}
                                />
                            </div>
                        </>
                    }
                </header>
                {view === "settings" ?
                    <SettingsPage
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
                        <div className="library-hero">
                            <h1>{title}</h1>
                            <p>{tracks.length} songs <span>•</span> {albums.length} albums</p>
                        </div>
                        <div className="content">
                            {library.error &&
                                <Alert variant="destructive">
                                    <AlertDescription>
                                        {library.error}
                                        <Button variant="ghost" size="sm" onClick={() => library.setError("")}>
                                            Dismiss
                                        </Button>
                                    </AlertDescription>
                                </Alert>
                            }

                            {library.notice &&
                                <p role="status" className="notice">
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

                                    <div className="collection-results">
                                        {renderCollection()}
                                    </div>

                                    {view === "duplicates" && !!tracks.length &&
                                        <p className="muted duplicate-note">
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
