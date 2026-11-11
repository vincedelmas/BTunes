import {Brain, ListMusic, Play, Shuffle} from "lucide-react";

import {Cover} from "@/components/cover";
import {AlbumGrid} from "@/components/library/album-grid";
import {ArtistGrid} from "@/components/library/artist-grid";
import {CollectionEmptyState} from "@/components/library/collection-empty-state";
import {FilterBar} from "@/components/library/filter-bar";
import {LibraryStats} from "@/components/library/library-stats";
import {SongDropZone} from "@/components/library/song-drop-zone";
import {TrackTable} from "@/components/library/track-table";
import {PageHeader} from "@/components/page-header";
import {Button} from "@/components/ui/button";
import {navigationItems} from "@/lib/sidebar-navigation";

import {getErrorMessage} from "../../../../shared/errors";

import type {Snapshot, Track} from "../../../../shared/types/library";
import type {CollectionState} from "@/types/collection";
import type {ItemReveal} from "@/types/reveal";
import type {TrackActions} from "@/types/track-actions";
import type {ReactNode} from "react";


interface LibraryPageProps {
    collection: CollectionState;
    data: Snapshot;
    current?: Track;
    playing: boolean;
    actions: TrackActions;
    reveal?: ItemReveal;
    onRevealed: () => void;
    onOpenAlbum: (tracks: Track[]) => void;
    onOpenArtist: (name: string) => void;
    onSettings: () => void;
    onImported: () => Promise<void>;
    onPlay: (shuffle: boolean) => void;
    visualizer: ReactNode;
    searchControl: ReactNode;
    feedback: ReactNode;
}


export function LibraryPage({
                                collection,
                                data,
                                current,
                                playing,
                                actions,
                                reveal,
                                onRevealed,
                                onOpenAlbum,
                                onOpenArtist,
                                onSettings,
                                onImported,
                                onPlay,
                                visualizer,
                                searchControl,
                                feedback
                            }: LibraryPageProps) {
    const { view, title, tracks, albums, sort, selected, search, artist, setSort, setSelected, setArtist, clearFilters } = collection;
    const navigation = navigationItems.find((item) => item.id === view);
    let icon = navigation?.icon ?? ListMusic;

    if (collection.activePlaylist) {
        icon = collection.activePlaylist.rule ? Brain : ListMusic;
    }
    else if (collection.smartMix) {
        icon = Brain;
    }

    const coverTrack = collection.activePlaylist
        ? tracks.find((track) => track.cover)
        : undefined;

    function renderCollection() {
        if (!tracks.length) {
            return <CollectionEmptyState
                view={view}
                onClearFilters={clearFilters}
                hasFilters={Boolean(search || artist)}
                hasTracks={Boolean(data.tracks.length)}
                hasFolders={Boolean(data.folders.length)}
                onSettings={onSettings}
            />;
        }

        if (view === "albums") {
            return <AlbumGrid
                currentTrack={current}
                reveal={reveal}
                onRevealed={onRevealed}
                albums={albums}
                actions={actions}
                playlists={data.playlists}
                onOpen={onOpenAlbum}
            />;
        }

        if (view === "artists") {
            return <ArtistGrid
                tracks={tracks}
                currentTrack={current}
                reveal={reveal}
                onRevealed={onRevealed}
                onArtist={onOpenArtist}
            />;
        }

        return <TrackTable
            reveal={reveal}
            onRevealed={onRevealed}
            sort={sort}
            tracks={tracks}
            onSort={setSort}
            actions={actions}
            selected={selected}
            onSelect={setSelected}
            currentId={current?.id}
            playing={playing}
            playlists={data.playlists}
        />;
    }

    return (
        <>
            <div className="library-hero shrink-0 border-b border-border/60 bg-linear-to-br from-primary/4 via-background to-background px-6 py-5">
                <PageHeader
                    icon={icon}
                    title={title}
                    artwork={coverTrack ? <Cover track={coverTrack} large/> : undefined}
                    search={searchControl}
                    visualizer={visualizer}
                    details={<div className="flex flex-col gap-1">
                        <LibraryStats tracks={tracks}/>
                        {collection.smartMix && <p>{collection.smartMix.description}</p>}
                    </div>}
                    actions={<>
                        <Button size="lg" className="rounded-full px-4" disabled={!tracks.length} onClick={() => onPlay(false)}>
                            <Play data-icon="inline-start" fill="currentColor"/>
                            Play all
                        </Button>
                        <Button variant="secondary" size="lg" className="rounded-full px-4" disabled={!tracks.length} onClick={() => onPlay(true)}>
                            <Shuffle data-icon="inline-start"/>
                            Shuffle
                        </Button>
                    </>}
                />
            </div>
            <div className="content flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-3">
                {feedback}
                <FilterBar artist={artist} search={search} onArtist={setArtist} onClear={clearFilters}/>
                <div className="collection-results flex min-h-0 flex-1 flex-col">
                    {view === "tracks" ? <SongDropZone
                        onImported={async () => {
                            clearFilters();
                            await onImported();
                        }}
                        onError={(error) => actions.onError(getErrorMessage(error))}
                    >
                        {renderCollection()}
                    </SongDropZone> : renderCollection()}
                </div>
                {view === "duplicates" && tracks.length > 0 && <p className="duplicate-note mx-2 mb-0 mt-3.5 shrink-0 text-xs text-muted-foreground">
                    Matches use title, artist, and rounded duration. No files are deleted.
                </p>}
            </div>
        </>
    );
}
