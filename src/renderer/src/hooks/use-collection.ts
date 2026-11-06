import {useDeferredValue, useEffect, useState} from "react";
import type {Snapshot} from "../../../shared/types/library";
import type {TrackSort} from "../../../shared/types/track-sorting";
import {compareTracks} from "../../../shared/track-sorting";
import {duplicateKey, groupAlbums, uniqueValues} from "@/lib/music";
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
    const [genre, setGenre] = useState("");
    const [artist, setArtist] = useState("");
    const [savedSort, setSavedSort] = usePreference<TrackSort>("btunes.song-sort.v1", trackSortSchema, { field: "title", descending: false });
    const [historySort, setHistorySort] = useState<TrackSort>({ field: "lastPlayed", descending: true });
    const sort = view === "history" ? historySort : savedSort;

    function setSort(next: TrackSort) {
        if (view === "history") setHistorySort(next);
        else setSavedSort(next);
    }

    const [playlistIds, setPlaylistIds] = useState<number[]>([]);
    const [returnView, setReturnView] = useState("tracks");
    const [selected, setSelected] = useState<number[]>([]);

    const genres = uniqueValues(data.tracks, "genre");
    const artists = uniqueValues(data.tracks, "artist");
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
        if (query && ![track.title, track.artist, track.album].join(" ").toLocaleLowerCase().includes(query)) return false;
        if (genre && track.genre !== genre) return false;
        if (artist && track.artist !== artist) return false;
        if (view === "history" && !track.lastPlayed) return false;
        if (view.startsWith("playlist:") && !playlistMembers.has(track.id)) return false;
        if (view === "duplicates" && (duplicates.get(duplicateKey(track)) ?? 0) < 2) return false;

        return true;
    }).sort((first, second) => compareTracks(first, second, sort));

    const albums = groupAlbums(tracks);
    const title = viewTitles[view] ?? activePlaylist?.name ?? "Playlist";

    function clearFilters() {
        setSearch("");
        setGenre("");
        setArtist("");
    }

    function returnToMusic() {
        const missingPlaylist = returnView.startsWith("playlist:") && !data.playlists.some((playlist) => "playlist:" + playlist.id === returnView);
        setView(missingPlaylist ? "tracks" : returnView);
    }

    function navigate(nextView: string) {
        if (nextView === view) return;

        if (nextView === "settings") {
            setReturnView(view);
            setView(nextView);
            return;
        }

        setView(nextView);
        setSelected([]);
        setPlaylistIds([]);
        clearFilters();
    }

    function showArtist(name: string) {
        navigate("tracks");
        clearFilters();
        setSelected([]);
        setArtist(name);
    }

    return {
        view, search, genre, artist, sort, selected, tracks, albums, genres, artists,
        activePlaylist, title,
        setSearch, setGenre, setArtist, setSort, setSelected,
        navigate, showArtist, clearFilters, returnToMusic,
    };
}
