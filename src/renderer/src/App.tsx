import {EmptyState} from "@/components/empty-state";
import {useEffect, useMemo, useState} from "react";
import {
    ArrowDownUp,
    Disc3,
    FolderPlus,
    Headphones,
    Pencil,
    Play,
    RefreshCw,
    Search,
    Smartphone,
} from "lucide-react";
import type {Track} from "../../shared/contracts";
import {Sidebar} from "@/components/library/sidebar";
import {AlbumGrid} from "@/components/library/album-grid";
import {TrackTable} from "@/components/library/track-table";
import {PlayerBar} from "@/components/player/player-bar";
import {QueuePanel} from "@/components/player/queue-panel";
import {TagEditor} from "@/components/tag-editor";
import {Cover} from "@/components/cover";
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
    albums: "Your albums",
    tracks: "All songs",
    artists: "Your artists",
    favorites: "Liked songs",
    history: "Recently played",
    duplicates: "Possible duplicates",
    android: "Your devices",
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
    const [genre, setGenre] = useState("");
    const [artist, setArtist] = useState("");
    const [sort, setSort] = useState("artist");
    const [playlistIds, setPlaylistIds] = useState<number[]>([]);
    const [showQueue, setShowQueue] = useState(false);
    const [selected, setSelected] = useState<number[]>([]);
    const [editing, setEditing] = useState<Track[]>();

    const genres = useMemo(
        () => uniqueValues(library.data.tracks, "genre"),
        [library.data.tracks],
    );
    const artists = useMemo(
        () => uniqueValues(library.data.tracks, "artist"),
        [library.data.tracks],
    );

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
    }, [view, library.data, library.reportError]);

    const tracks = useMemo(() => {
        const duplicates = new Map<string, number>();

        for (const track of library.data.tracks) {
            const key = duplicateKey(track);
            duplicates.set(key, (duplicates.get(key) ?? 0) + 1);
        }

        return library.data.tracks
            .filter((track) => {
                const searchable = [track.title, track.artist, track.album]
                    .join(" ")
                    .toLocaleLowerCase();

                if (search && !searchable.includes(search.toLocaleLowerCase()))
                    return false;
                if (genre && track.genre !== genre) return false;
                if (artist && track.artist !== artist) return false;
                if (view === "favorites" && !track.favorite) return false;
                if (view === "history" && !track.lastPlayed) return false;
                if (view.startsWith("playlist:") && !playlistIds.includes(track.id))
                    return false;
                if (
                    view === "duplicates" &&
                    (duplicates.get(duplicateKey(track)) ?? 0) < 2
                )
                    return false;

                return true;
            })
            .sort((first, second) => {
                if (view === "history") return second.lastPlayed - first.lastPlayed;
                if (sort === "year") return second.year - first.year;
                if (sort === "plays") return second.plays - first.plays;

                const field = sort as "artist" | "album" | "title";
                return first[field].localeCompare(second[field]);
            });
    }, [library.data.tracks, search, genre, artist, view, playlistIds, sort]);

    const albums = useMemo(() => groupAlbums(tracks), [tracks]);
    const title =
        viewTitles[view] ??
        library.data.playlists.find(
            (playlist) => "playlist:" + playlist.id === view,
        )?.name ??
        "Playlist";
    const current =
        library.data.tracks.find((track) => track.id === player.current?.id) ??
        player.current;
    const selectedTracks = tracks.filter((track) => selected.includes(track.id));

    function navigate(nextView: string) {
        setView(nextView);
        setSelected([]);
        setPlaylistIds([]);
        setArtist("");
        setGenre("");
    }

    async function tagsSaved(message: string) {
        await library.refresh();
        library.setNotice(message);
    }

    function renderCollection() {
        if (!tracks.length) {
            return (
                <EmptyState
                    icon={Disc3}
                    title={
                        library.data.tracks.length
                            ? "Nothing here yet"
                            : "All your music. One place."
                    }
                    description={
                        library.data.tracks.length
                            ? "Try different filters or add songs to this playlist."
                            : "Bring your favorite albums, hidden gems, and everything in between. Start with a music folder."
                    }
                >
                    <Button
                        disabled={library.busy}
                        onClick={() => void library.importFolder()}
                    >
                        <FolderPlus/>
                        Add music folder
                    </Button>
                </EmptyState>
            );
        }

        if (view === "albums")
            return (
                <AlbumGrid albums={albums} onPlay={player.start} onEdit={setEditing}/>
            );

        if (view === "artists") {
            return (
                <div className="artist-grid">
                    {uniqueValues(tracks, "artist").map((name) => (
                        <button
                            key={name}
                            className="artist"
                            onClick={() => {
                                setArtist(name);
                                setView("tracks");
                            }}
                        >
                            <Cover
                                track={tracks.find((track) => track.artist === name)}
                                large
                            />
                            <h2>{name}</h2>
                            <p>
                                Artist ·{" "}
                                {tracks.filter((track) => track.artist === name).length} songs
                            </p>
                        </button>
                    ))}
                </div>
            );
        }

        return (
            <TrackTable
                tracks={tracks}
                playlists={library.data.playlists}
                currentId={current?.id}
                playing={player.playing}
                selected={selected}
                onSelect={setSelected}
                onPlay={(track) => player.start(track, tracks)}
                onFavorite={(track) => void library.favorite(track)}
                onEdit={setEditing}
                onAdd={(playlistId, trackId) =>
                    void library.addToPlaylist(playlistId, trackId)
                }
            />
        );
    }

    return (
        <div className="app-shell">
            <Sidebar
                data={library.data}
                view={view}
                genres={genres}
                busy={library.busy}
                onNavigate={navigate}
                onImport={() => void library.importFolder()}
                onRefresh={library.refresh}
                onError={library.reportError}
            />

            <main>
                <header className="topbar">
                    <div className="page-context">
                        <Headphones size={20}/>
                        <span>Your music</span>
                    </div>
                    <div className="search">
                        <Search size={21} aria-hidden="true"/>
                        <Input
                            aria-label="Search your library"
                            placeholder="What do you want to listen to?"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Refresh library"
                        onClick={() => void library.refresh().catch(library.reportError)}
                    >
                        <RefreshCw/>
                    </Button>
                    <div className="profile-avatar" title="Local library">
                        B
                    </div>
                </header>

                <div className="library-hero">
                    <p className="eyebrow">Made of everything you love</p>
                    <h1>{title}</h1>
                    <p>
                        {tracks.length} songs <span>•</span> {albums.length} albums{" "}
                        <span>•</span> Always yours
                    </p>
                </div>

                <div className="content">
                    {library.error && (
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
                    )}
                    {library.notice && (
                        <p role="status" className="notice">
                            {library.notice}
                        </p>
                    )}

                    {view === "android" ? (
                        <EmptyState
                            icon={Smartphone}
                            title="Take your music with you"
                            description="Compare your computer and phone, find missing songs, and sync over USB or KDE Connect."
                        >
                            <Badge variant="secondary">Coming next</Badge>
                        </EmptyState>
                    ) : (
                        <>
                            <div className="collection-toolbar">
                                <Button
                                    size="icon"
                                    className="collection-play"
                                    aria-label="Play visible songs"
                                    disabled={!tracks.length}
                                    onClick={() => player.start(tracks[0], tracks)}
                                >
                                    <Play fill="currentColor"/>
                                </Button>
                                <span className="muted">Your collection, without limits.</span>
                                {!!selectedTracks.length && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setEditing(selectedTracks)}
                                    >
                                        <Pencil/>
                                        Edit tags ({selectedTracks.length})
                                    </Button>
                                )}
                            </div>

                            <div className="filters">
                                <div className="flex gap-3">
                                    <FilterSelect
                                        label="Filter by genre"
                                        placeholder="All genres"
                                        value={genre}
                                        options={genres.map((name) => ({
                                            value: name,
                                            label: name,
                                        }))}
                                        onChange={setGenre}
                                    />
                                    <FilterSelect
                                        label="Filter by artist"
                                        placeholder="All artists"
                                        value={artist}
                                        options={artists.map((name) => ({
                                            value: name,
                                            label: name,
                                        }))}
                                        onChange={setArtist}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <ArrowDownUp size={14}/>
                                    <FilterSelect
                                        label="Sort songs"
                                        placeholder="Artist"
                                        value={sort}
                                        options={sortOptions}
                                        onChange={(value) => setSort(value || "artist")}
                                    />
                                </div>
                            </div>

                            {renderCollection()}

                            {view === "duplicates" && (
                                <p className="muted">
                                    Matches use title, artist, and rounded duration. No files are
                                    deleted.
                                </p>
                            )}
                        </>
                    )}
                </div>
            </main>

            {showQueue && (
                <QueuePanel player={player} onClose={() => setShowQueue(false)}/>
            )}
            <PlayerBar
                player={player}
                current={current}
                onFavorite={(track) => void library.favorite(track)}
                onQueue={() => setShowQueue(!showQueue)}
            />
            {editing && (
                <TagEditor
                    tracks={editing}
                    onClose={() => setEditing(undefined)}
                    onSaved={tagsSaved}
                />
            )}

            <audio
                ref={player.audio}
                src={
                    player.current ? "btunes://audio/" + player.current.id : undefined
                }
                onPlay={() => player.setPlaying(true)}
                onPause={() => player.setPlaying(false)}
                onTimeUpdate={player.updateTime}
                onEnded={() => player.next()}
                onError={() => {
                    if (player.current)
                        library.setError(
                            "Unable to play this file. It may be missing or use an unsupported codec.",
                        );
                }}
            />
        </div>
    );
}
