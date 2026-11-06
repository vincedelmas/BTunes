import {useState} from "react";
import {ArrowLeft, Headphones, Play, Search, Smartphone} from "lucide-react";
import type {Track} from "../../shared/types/library";
import {Sidebar} from "@/components/library/sidebar";
import {AlbumGrid} from "@/components/library/album-grid";
import {ArtistGrid} from "@/components/library/artist-grid";
import {TrackTable} from "@/components/library/track-table";
import type {TrackActions} from "@/types/track-actions";
import {CollectionEmptyState} from "@/components/library/collection-empty-state";
import {PlayerBar} from "@/components/player/player-bar";
import {QueuePanel} from "@/components/player/queue-panel";
import {TagEditor} from "@/components/tag-editor";
import {SettingsPage} from "@/components/settings-page";
import {FilterBar} from "@/components/library/filter-bar";
import {EmptyState} from "@/components/empty-state";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {useLibrary} from "@/hooks/use-library";
import {usePlayer} from "@/hooks/use-player";
import {useCollection} from "@/hooks/use-collection";

export function App() {
    const library = useLibrary();
    const player = usePlayer(library.setError);
    const { audio: audioRef } = player;
    const [showQueue, setShowQueue] = useState(false);
    const [editing, setEditing] = useState<Track[]>();
    const collection = useCollection(library.data, library.reportError);
    const {
        view, search, genre, artist, sort, selected, tracks, albums, genres, artists,
        activePlaylist, title,
        setSearch, setGenre, setArtist, setSort, setSelected,
        navigate, showArtist, clearFilters, returnToMusic,
    } = collection;
    const current = library.data.tracks.find((track) => track.id === player.currentTrack?.id) ?? player.currentTrack;
    const showCollectionPlay = view !== "tracks" && tracks.length > 0;

    const actions: TrackActions = {
        onPlay: (track, list = tracks) => player.start(track, list),
        onEdit: setEditing,
        onEnqueue: player.enqueue,
        onAdd: (playlistId, trackIds) => void library.addToPlaylist(playlistId, trackIds),
        onArtist: showArtist,
        onError: library.setError,
        onRemove: activePlaylist && !activePlaylist.rule
            ? (trackIds) => void library.removeFromPlaylist(activePlaylist.id, trackIds)
            : undefined,
    };

    async function tagsSaved(message: string) {
        await library.refresh();
        library.setNotice(message);
    }

    function renderCollection() {
        if (!tracks.length) {
            return <CollectionEmptyState
                view={view}
                hasTracks={Boolean(library.data.tracks.length)}
                hasFolders={Boolean(library.data.folders.length)}
                hasFilters={Boolean(search || genre || artist)}
                onClearFilters={clearFilters}
                onSettings={() => navigate("settings")}
            />;
        }

        if (view === "albums") return <AlbumGrid albums={albums} playlists={library.data.playlists} actions={actions}/>;
        if (view === "artists") return <ArtistGrid tracks={tracks} onArtist={showArtist}/>;

        return <TrackTable tracks={tracks} playlists={library.data.playlists} currentId={current?.id}
                           sort={sort} onSort={setSort} playing={player.playing} selected={selected} onSelect={setSelected} actions={actions}/>;
    }

    return (
        <div className="app-shell">
            <Sidebar data={library.data} view={view} genres={genres} onNavigate={navigate}
                     onSettings={() => navigate("settings")} onRefresh={library.refresh} onError={library.reportError}/>
            <main>
                <header className="topbar">
                    {view === "settings" ? (
                        <Button variant="ghost" onClick={returnToMusic}>
                            <ArrowLeft/>Back to music
                        </Button>
                    ) : (
                        <>
                            <div className="page-context">
                                <Headphones size={20}/>
                                <span>Music</span>
                            </div>
                            <div className="search">
                                <Search size={21} aria-hidden="true"/>
                                <Input
                                    aria-label="Search your library"
                                    placeholder="Search songs, artists, albums"
                                    value={search}
                                    onChange={(ev) => setSearch(ev.target.value)}
                                />
                            </div>
                        </>
                    )}
                </header>
                {view === "settings" ? <SettingsPage folders={library.data.folders} busy={library.busy} songCount={library.data.tracks.length}
                                                     notice={library.notice} error={library.error} onImport={() => void library.importFolder()}
                                                     onRefresh={() => void library.refresh().then(() => library.setNotice("Library refreshed.")).catch(library.reportError)}/> : <>
                    <div className="library-hero">
                        <h1>{title}</h1>
                        <p>{tracks.length} songs <span>•</span> {albums.length} albums</p>
                    </div>
                    <div className="content">
                        {library.error && <Alert variant="destructive">
                            <AlertDescription>
                                {library.error}
                                <Button variant="ghost" size="sm" onClick={() => library.setError("")}>Dismiss</Button>
                            </AlertDescription>
                        </Alert>}
                        {library.notice && <p role="status" className="notice">{library.notice}</p>}
                        {view === "android" ? (
                            <EmptyState icon={Smartphone} title="Take your music with you"
                                        description="Compare your computer and phone, find missing songs, and sync over USB or KDE Connect.">
                                <Badge variant="secondary">Coming next</Badge>
                            </EmptyState>
                        ) : (
                            <>
                                {showCollectionPlay && <div className="collection-toolbar">
                                    <Button size="icon" className="collection-play" aria-label="Play visible songs"
                                            onClick={() => player.start(tracks[0], tracks)}>
                                        <Play fill="currentColor"/>
                                    </Button>
                                </div>}
                                <FilterBar genre={genre} artist={artist} search={search} genres={genres} artists={artists} sort={sort}
                                           showControls={view !== "tracks"} showSort={view === "albums" || view === "artists"} onGenre={setGenre} onArtist={setArtist}
                                           onSort={setSort} onClear={clearFilters}/>
                                <div className="collection-results">{renderCollection()}</div>
                                {view === "duplicates" && !!tracks.length &&
                                    <p className="muted duplicate-note">Matches use title, artist, and rounded duration. No files are deleted.</p>}
                            </>
                        )}
                    </div>
                </>}
            </main>
            {showQueue && <QueuePanel player={player} onClose={() => setShowQueue(false)}/>}
            <PlayerBar player={player} current={current} onQueue={() => setShowQueue(!showQueue)}/>
            {editing && <TagEditor tracks={editing} onClose={() => setEditing(undefined)} onSaved={tagsSaved}/>}
            <audio ref={audioRef} src={player.currentTrack ? "btunes://audio/" + player.currentTrack.id : undefined}
                   onPlay={() => player.setPlaying(true)} onPause={() => player.setPlaying(false)}
                   onTimeUpdate={player.updateTime} onEnded={() => player.next()}
                   onError={() => {
                       if (player.currentTrack) library.setError("Unable to play this file. It may be missing or use an unsupported codec.");
                   }}
            />
        </div>
    );
}
