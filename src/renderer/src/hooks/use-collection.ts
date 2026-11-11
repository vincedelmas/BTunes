import {selectSmartMix, smartMixes} from "../../../shared/smart-mixes";
import type {CollectionLocation} from "@/types/collection";
import {genreChoices} from "../../../shared/genres";
import {useDeferredValue, useEffect, useRef, useState} from "react";
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
    downloads: "Downloads",
};

export function useCollection(data: Snapshot, onError: (error: unknown) => void) {
    const history = useRef<CollectionLocation[]>([]);
    const future = useRef<CollectionLocation[]>([]);
    const [view, setView] = useState("tracks");
    const [search, updateSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [artist, setArtist] = useState("");
    const [savedSort, setSavedSort] = usePreference<TrackSort>("btunes.song-sort.v1", trackSortSchema, { field: "title", descending: false });
    const [mixSorts, setMixSorts] = useState<Record<string, TrackSort>>({});
    const smartMix = smartMixes.find((mix) => mix.id === view);
    const sort = smartMix ? (mixSorts[view] ?? smartMix.sort) : savedSort;

    function setSort(next: TrackSort) {
        if (smartMix) setMixSorts((previous) => ({ ...previous, [view]: next }));
        else setSavedSort(next);
    }

    const [playlistIds, setPlaylistIds] = useState<number[]>([]);
    const [selected, setSelected] = useState<number[]>([]);

    const genres = genreChoices(data.tracks.map((track) => track.genre));
    const activePlaylist = data.playlists.find((playlist) => "playlist:" + playlist.id === view);
    const playlistId = activePlaylist?.id;

    useEffect(() => {
        let active = true;
        if (!playlistId) return;

        void rpc("playlist.tracks", { id: playlistId })
            .then((ids) => {
                if (active) setPlaylistIds(ids);
            })
            .catch((error) => {
                if (active) onError(error);
            });

        return () => {
            active = false;
        };
    }, [playlistId, data.revision, onError]);

    const duplicates = new Map<string, number>();
    const playlistMembers = new Set(playlistIds);
    const query = deferredSearch.trim().toLocaleLowerCase();

    if (view === "duplicates") {
        for (const track of data.tracks) {
            const key = duplicateKey(track);
            duplicates.set(key, (duplicates.get(key) ?? 0) + 1);
        }
    }

    const collectionTracks = view === "settings" || view === "android" || view === "downloads" ? [] : selectSmartMix(view, data.tracks);
    const tracks = collectionTracks.filter((track) => {
        if (query && ![track.title, track.artist, track.albumArtist, track.album].join(" ").toLocaleLowerCase().includes(query)) return false;
        if (artist && getAlbumArtist(track) !== artist) return false;
        if (view === "history" && !track.lastPlayed) return false;
        if (view.startsWith("playlist:") && !playlistMembers.has(track.id)) return false;
        if (view === "duplicates" && (duplicates.get(duplicateKey(track)) ?? 0) < 2) return false;

        return true;
    }).sort((first, second) => compareTracks(first, second, sort));

    const albums = view === "albums" ? groupAlbums(tracks) : [];
    const title = smartMix?.name ?? viewTitles[view] ?? activePlaylist?.name ?? "Playlist";

    function clearFilters() {
        updateSearch("");
        setArtist("");
    }

    function currentLocation(): CollectionLocation {
        return { view, search, artist };
    }

    function rememberView() {
        history.current.push(currentLocation());
        if (history.current.length > 100) history.current.shift();
        future.current = [];
    }

    function restore(location: CollectionLocation) {
        const missingPlaylist = location.view.startsWith("playlist:") && !data.playlists.some((playlist) => "playlist:" + playlist.id === location.view);
        const restoredView = missingPlaylist ? "tracks" : location.view;
        setView(restoredView);
        updateSearch(location.search);
        setArtist(location.artist);
        setSelected([]);
        if (restoredView !== view) setPlaylistIds([]);
    }

    function takeDifferentLocation(stack: CollectionLocation[]) {
        const current = currentLocation();
        while (stack.length) {
            const next = stack.pop()!;
            if (next.view !== current.view || next.search !== current.search || next.artist !== current.artist) return next;
        }
        return undefined;
    }

    function goBack() {
        const previous = takeDifferentLocation(history.current);
        if (!previous) return;

        future.current.push(currentLocation());
        restore(previous);
    }

    function goForward() {
        const next = takeDifferentLocation(future.current);
        if (!next) return;

        history.current.push(currentLocation());
        restore(next);
    }

    function setSearch(value: string) {
        // One history entry per search, rather than one per keystroke.
        if (!search && value) rememberView();
        else future.current = [];
        updateSearch(value);
    }

    function clearSearch() {
        if (!search) return;

        // Leaving a search via X keeps it ahead, ready for Mouse 5 to reopen.
        future.current.push(currentLocation());
        updateSearch("");
        setSelected([]);
    }

    function navigate(nextView: string) {
        if (nextView === view) return;

        rememberView();
        setView(nextView);
        setSelected([]);
        setPlaylistIds([]);
        clearFilters();
    }

    function showArtist(name: string) {
        if (view === "tracks") rememberView();
        navigate("tracks");
        clearFilters();
        setSelected([]);
        setArtist(name);
    }

    return {
        view, search, artist, sort, selected, tracks, albums, genres,
        activePlaylist, title, smartMix,
        setSearch, setArtist, setSort, setSelected,
        navigate, goBack, goForward, clearSearch, showArtist, clearFilters,
    };
}
