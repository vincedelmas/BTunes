import {genreChoices} from "../../../shared/genres";
import {useDeferredValue, useEffect, useState} from "react";
import type {Snapshot} from "../../../shared/types/library";
import type {TrackSort} from "../../../shared/types/track-sorting";
import {compareTracks} from "../../../shared/track-sorting";
import {duplicateKey, groupAlbums, getAlbumArtist} from "@/lib/music";
import {rpc} from "@/lib/rpc";
import {usePreference} from "@/hooks/use-preference";
import {trackSortSchema} from "../../../shared/schemas/preferences";

const viewTitles: Record<string, string> = {
    albums: "Albums",
    tracks: "Songs",
    artists: "Artists",
    history: "Recently played",
    duplicates: "Possible duplicates",
    android: "Devices",
};

export function useCollection(data: Snapshot, onError: (error: unknown) => void) {
    const [view, setView] = useState("tracks");
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [artist, setArtist] = useState("");
    const [albumArtistFilter, setAlbumArtistFilter] = useState(false);
    const [savedSort, setSavedSort] = usePreference<TrackSort>("btunes.song-sort.v1", trackSortSchema, { field: "title", descending: false });
    const [historySort, setHistorySort] = useState<TrackSort>({ field: "lastPlayed", descending: true });
    const sort = view === "history" ? historySort : savedSort;

    function setSort(next: TrackSort) {
        if (view === "history") setHistorySort(next);
        else setSavedSort(next);
    }

    const [playlistIds, setPlaylistIds] = useState<number[]>([]);
    const [selected, setSelected] = useState<number[]>([]);

    const genres = genreChoices(data.tracks.map((track) => track.genre));
    const activePlaylist = data.playlists.find((playlist) => "playlist:" + playlist.id === view);

    useEffect(() => {
        let active = true;
        if (!view.startsWith("playlist:")) return;

        void rpc("playlist.tracks", { id: Number(view.split(":")[1]) })
            .then((ids) => {
                if (active) setPlaylistIds(ids);
            })
            .catch(onError);

        return () => {
            active = false;
        };
    }, [view, data.revision, onError]);

    const duplicates = new Map<string, number>();
    const playlistMembers = new Set(playlistIds);
    const query = deferredSearch.trim().toLocaleLowerCase();

    if (view === "duplicates") {
        for (const track of data.tracks) {
            const key = duplicateKey(track);
            duplicates.set(key, (duplicates.get(key) ?? 0) + 1);
        }
    }

    const tracks = data.tracks.filter((track) => {
        if (query && ![track.title, track.artist, track.albumArtist, track.album].join(" ").toLocaleLowerCase().includes(query)) return false;
        if (artist && (albumArtistFilter ? getAlbumArtist(track) : track.artist) !== artist) return false;
        if (view === "history" && !track.lastPlayed) return false;
        if (view.startsWith("playlist:") && !playlistMembers.has(track.id)) return false;
        if (view === "duplicates" && (duplicates.get(duplicateKey(track)) ?? 0) < 2) return false;

        return true;
    }).sort((first, second) => compareTracks(first, second, sort));

    const albums = groupAlbums(tracks);
    const title = viewTitles[view] ?? activePlaylist?.name ?? "Playlist";

    function clearFilters() {
        setSearch("");
        setArtist("");
    }

    function navigate(nextView: string) {
        if (nextView === view) return;

        setView(nextView);
        setSelected([]);
        setPlaylistIds([]);
        clearFilters();
    }

    function showArtist(name: string, useAlbumArtist = false) {
        navigate("tracks");
        clearFilters();
        setSelected([]);
        setArtist(name);
        setAlbumArtistFilter(useAlbumArtist);
    }

    return {
        view, search, artist, sort, selected, tracks, albums, genres,
        activePlaylist, title,
        setSearch, setArtist, setSort, setSelected,
        navigate, showArtist, clearFilters,
    };
}
