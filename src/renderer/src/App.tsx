import {useDeferredValue, useEffect, useMemo, useState} from "react";
import {ArrowDownUp, Headphones, Pencil, Play, RefreshCw, Search, Smartphone} from "lucide-react";
import type {Track} from "../../shared/contracts";
import {Sidebar} from "@/components/library/sidebar";
import {AlbumGrid} from "@/components/library/album-grid";
import {ArtistGrid} from "@/components/library/artist-grid";
import {TrackTable} from "@/components/library/track-table";
import type {TrackActions} from "@/components/library/track-context-menu";
import {CollectionEmptyState} from "@/components/library/collection-empty-state";
import {PlayerBar} from "@/components/player/player-bar";
import {QueuePanel} from "@/components/player/queue-panel";
import {TagEditor} from "@/components/tag-editor";
import {SettingsPanel} from "@/components/settings-panel";
import {EmptyState} from "@/components/empty-state";
import {FilterSelect} from "@/components/filter-select";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {useLibrary} from "@/hooks/use-library";
import {usePlayer} from "@/hooks/use-player";
import {duplicateKey, groupAlbums, uniqueValues} from "@/lib/music";
import {rpc} from "@/lib/rpc";

const viewTitles: Record<string, string> = {
    albums: "Albums",
    tracks: "Songs",
    artists: "Artists",
    history: "Recently played",
    duplicates: "Possible duplicates",
    android: "Devices",
};

const sortOptions = [
    { value: "artist", label: "Artist" },
    { value: "album", label: "Album" },
    { value: "title", label: "Title" },
    { value: "year", label: "Year" },
    { value: "plays", label: "Play count" },
];

export function App() {
    const library = useLibrary();
    const player = usePlayer(library.setError);
    const [view, setView] = useState("albums");
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [genre, setGenre] = useState("");
    const [artist, setArtist] = useState("");
    const [sort, setSort] = useState("artist");
    const [playlistIds, setPlaylistIds] = useState<number[]>([]);
    const [showQueue, setShowQueue] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [selected, setSelected] = useState<number[]>([]);
    const [editing, setEditing] = useState<Track[]>();

    const genres = useMemo(() => uniqueValues(library.data.tracks, "genre"), [library.data.tracks]);
    const artists = useMemo(() => uniqueValues(library.data.tracks, "artist"), [library.data.tracks]);
    const activePlaylist = library.data.playlists.find((playlist) => "playlist:" + playlist.id === view);

    useEffect(() => {
        let active = true;
        if (!view.startsWith("playlist:")) return;

        void rpc("playlist.tracks", { id: Number(view.split(":")[1]) })
            .then((ids) => {
                if (active) setPlaylistIds(ids);
            })
            .catch(library.reportError);

        return () => {
            active = false;
        };
    }, [view, library.data.revision, library.reportError]);

    const tracks = useMemo(() => {
        const duplicates = new Map<string, number>();
        const playlistMembers = new Set(playlistIds);
        const query = deferredSearch.trim().toLocaleLowerCase();

        if (view === "duplicates") {
            for (const track of library.data.tracks) {
                const key = duplicateKey(track);
                duplicates.set(key, (duplicates.get(key) ?? 0) + 1);
            }
        }

        return library.data.tracks.filter((track) => {
            if (query && ![track.title, track.artist, track.album].join(" ").toLocaleLowerCase().includes(query)) return false;
            if (genre && track.genre !== genre) return false;
            if (artist && track.artist !== artist) return false;
            if (view === "history" && !track.lastPlayed) return false;
            if (view.startsWith("playlist:") && !playlistMembers.has(track.id)) return false;
            if (view === "duplicates" && (duplicates.get(duplicateKey(track)) ?? 0) < 2) return false;

            return true;
        }).sort((first, second) => {
            if (view === "history") return second.lastPlayed - first.lastPlayed;
            if (sort === "year") return second.year - first.year;
            if (sort === "plays") return second.plays - first.plays;

            const field = sort as "artist" | "album" | "title";
            return first[field].localeCompare(second[field]);
        });
    }, [library.data.tracks, deferredSearch, genre, artist, view, playlistIds, sort]);

    const albums = useMemo(() => groupAlbums(tracks), [tracks]);
    const selectedTracks = useMemo(() => {
        const ids = new Set(selected);
        return tracks.filter((track) => ids.has(track.id));
    }, [tracks, selected]);
    const title = viewTitles[view] ?? activePlaylist?.name ?? "Playlist";
    const current = library.data.tracks.find((track) => track.id === player.current?.id) ?? player.current;

    function clearFilters() {
        setSearch("");
        setGenre("");
        setArtist("");
    }

    function navigate(nextView: string) {
        setView(nextView);
        setSelected([]);
        setPlaylistIds([]);
        clearFilters();
    }

    function showArtist(name: string) {
        navigate("tracks");
        setArtist(name);
    }

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
                onSettings={() => setShowSettings(true)}
            />;
        }

        if (view === "albums") return <AlbumGrid albums={albums} playlists={library.data.playlists} actions={actions}/>;
        if (view === "artists") return <ArtistGrid tracks={tracks} onArtist={showArtist}/>;

        return <TrackTable tracks={tracks} playlists={library.data.playlists} currentId={current?.id}
                           playing={player.playing} selected={selected} onSelect={setSelected} actions={actions}/>;
    }

    return (
        <div className="app-shell">
            <Sidebar data={library.data} view={view} genres={genres} onNavigate={navigate}
                     onSettings={() => setShowSettings(true)} onRefresh={library.refresh} onError={library.reportError}/>
            <main>
                <header className="topbar">
                    <div className="page-context">
                        <Headphones size={20}/>
                        <span>Music</span>
                    </div>
                    <div className="search">
                        <Search size={21} aria-hidden="true"/>
                        <Input aria-label="Search your library" placeholder="Search songs, artists, albums" value={search} onChange={(ev) => setSearch(ev.target.value)}/>
                    </div>
                    <Button variant="ghost" size="icon" aria-label="Refresh library" onClick={() => void library.refresh().catch(library.reportError)}>
                        <RefreshCw/>
                    </Button>
                    <div className="profile-avatar" title="Local library">B</div>
                </header>
                <div className="library-hero">
                    <h1>{title}</h1>
                    <p>{tracks.length} songs <span>•</span> {albums.length} albums</p>
                </div>
                <div className="content">
                    {library.error && <Alert variant="destructive">
                        <AlertDescription>{library.error}<Button variant="ghost" size="sm" onClick={() => library.setError("")}>Dismiss</Button>
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
                            {!!tracks.length && <div className="collection-toolbar">
                                <Button size="icon" className="collection-play" aria-label="Play visible songs" disabled={!tracks.length}
                                        onClick={() => player.start(tracks[0], tracks)}>
                                    <Play fill="currentColor"/>
                                </Button>
                                {!!selectedTracks.length && <Button variant="outline" onClick={() => setEditing(selectedTracks)}>
                                    <Pencil/>Edit tags ({selectedTracks.length})</Button>}
                            </div>}
                            <div className="filters">
                                <div className="flex gap-3">
                                    <FilterSelect label="Filter by genre" placeholder="All genres" value={genre} options={genres.map((name) => ({ value: name, label: name }))}
                                                  onChange={setGenre}/>
                                    <FilterSelect label="Filter by artist" placeholder="All artists" value={artist} options={artists.map((name) => ({ value: name, label: name }))}
                                                  onChange={setArtist}/>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ArrowDownUp size={14}/>
                                    <FilterSelect label="Sort songs" placeholder="Artist" value={sort} options={sortOptions} onChange={(value) => setSort(value || "artist")}/>
                                </div>
                            </div>
                            <div className="collection-results">{renderCollection()}</div>
                            {view === "duplicates" && !!tracks.length &&
                                <p className="muted duplicate-note">Matches use title, artist, and rounded duration. No files are deleted.</p>}
                        </>
                    )}
                </div>
            </main>
            {showQueue && <QueuePanel player={player} onClose={() => setShowQueue(false)}/>}
            <PlayerBar player={player} current={current} onQueue={() => setShowQueue(!showQueue)}/>
            {editing && <TagEditor tracks={editing} onClose={() => setEditing(undefined)} onSaved={tagsSaved}/>}
            {showSettings &&
                <SettingsPanel folders={library.data.folders} busy={library.busy} onImport={() => void library.importFolder()} onClose={() => setShowSettings(false)}/>}
            <audio ref={player.audio} src={player.current ? "btunes://audio/" + player.current.id : undefined}
                   onPlay={() => player.setPlaying(true)} onPause={() => player.setPlaying(false)}
                   onTimeUpdate={player.updateTime} onEnded={() => player.next()}
                   onError={() => {
                       if (player.current) library.setError("Unable to play this file. It may be missing or use an unsupported codec.");
                   }}
            />
        </div>
    );
}
