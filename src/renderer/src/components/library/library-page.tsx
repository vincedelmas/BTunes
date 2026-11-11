import type {ReactNode} from "react";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import type {ItemReveal} from "@/types/reveal";
import {PageHeader} from "@/components/page-header";
import type {CollectionState} from "@/types/collection";
import type {TrackActions} from "@/types/track-actions";
import {navigationItems} from "@/lib/sidebar-navigation";
import {AlbumGrid} from "@/components/library/album-grid";
import {FilterBar} from "@/components/library/filter-bar";
import {getErrorMessage} from "../../../../shared/errors";
import {ArtistGrid} from "@/components/library/artist-grid";
import {TrackTable} from "@/components/library/track-table";
import {Brain, ListMusic, Play, Shuffle} from "lucide-react";
import {LibraryStats} from "@/components/library/library-stats";
import {SongDropZone} from "@/components/library/song-drop-zone";
import type {Snapshot, Track} from "../../../../shared/types/library";
import {CollectionEmptyState} from "@/components/library/collection-empty-state";


interface LibraryPageProps {
    data: Snapshot;
    current?: Track;
    playing: boolean;
    reveal?: ItemReveal;
    feedback: ReactNode;
    actions: TrackActions;
    visualizer: ReactNode;
    onRevealed: () => void;
    onSettings: () => void;
    searchControl: ReactNode;
    collection: CollectionState;
    onImported: () => Promise<void>;
    onPlay: (shuffle: boolean) => void;
    onOpenArtist: (name: string) => void;
    onOpenAlbum: (tracks: Track[]) => void;
}


export function LibraryPage(props: LibraryPageProps) {
    const {
        collection, data, current, playing, actions, reveal, onRevealed, onOpenAlbum,
        onOpenArtist, onSettings, onImported, onPlay, visualizer, searchControl, feedback,
    } = props;

    const { view, title, tracks, albums, sort, selected, search, artist, setSort, setSelected, setArtist, clearFilters } = collection;

    const navigation = navigationItems.find((item) => item.id === view);
    let icon = navigation?.icon ?? ListMusic;

    if (collection.activePlaylist) icon = collection.activePlaylist.rule ? Brain : ListMusic;
    else if (collection.smartMix) icon = Brain;

    const coverTrack = collection.activePlaylist
        ? tracks.find((track) => track.cover)
        : undefined;

    function renderCollection() {
        if (!tracks.length) {
            return (
                <CollectionEmptyState
                    view={view}
                    onSettings={onSettings}
                    onClearFilters={clearFilters}
                    hasFilters={Boolean(search || artist)}
                    hasTracks={Boolean(data.tracks.length)}
                    hasFolders={Boolean(data.folders.length)}
                />
            );
        }

        if (view === "albums") {
            return (
                <AlbumGrid
                    reveal={reveal}
                    albums={albums}
                    actions={actions}
                    onOpen={onOpenAlbum}
                    currentTrack={current}
                    onRevealed={onRevealed}
                    playlists={data.playlists}
                />
            );
        }

        if (view === "artists") {
            return (
                <ArtistGrid
                    tracks={tracks}
                    reveal={reveal}
                    currentTrack={current}
                    onRevealed={onRevealed}
                    onArtist={onOpenArtist}
                />
            );
        }

        return (
            <TrackTable
                sort={sort}
                reveal={reveal}
                tracks={tracks}
                onSort={setSort}
                actions={actions}
                playing={playing}
                selected={selected}
                onSelect={setSelected}
                onRevealed={onRevealed}
                currentId={current?.id}
                playlists={data.playlists}
            />
        );
    }

    return (
        <>
            <div className="library-hero shrink-0 border-b border-border/60 bg-linear-to-br from-primary/4 via-background to-background px-6 py-5">
                <PageHeader
                    icon={icon}
                    title={title}
                    search={searchControl}
                    visualizer={visualizer}
                    artwork={coverTrack ?
                        <Cover
                            large={true}
                            track={coverTrack}
                        />
                        :
                        undefined
                    }
                    details={
                        <div className="flex flex-col gap-1">
                            <LibraryStats
                                tracks={tracks}
                            />
                        </div>
                    }
                    actions={
                        <>
                            <Button
                                size="lg"
                                disabled={!tracks.length}
                                className="rounded-full px-4"
                                onClick={() => onPlay(false)}
                            >
                                <Play fill="currentColor" data-icon="inline-start"/>
                                Play all
                            </Button>
                            <Button
                                size="lg"
                                variant="secondary"
                                disabled={!tracks.length}
                                className="rounded-full px-4"
                                onClick={() => onPlay(true)}
                            >
                                <Shuffle data-icon="inline-start"/>
                                Shuffle
                            </Button>
                        </>
                    }
                />
            </div>
            <div className="content flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-3">
                {feedback}
                <FilterBar
                    artist={artist}
                    search={search}
                    onArtist={setArtist}
                    onClear={clearFilters}
                />
                <div className="collection-results flex min-h-0 flex-1 flex-col">
                    {view === "tracks" ? (
                        <SongDropZone
                            onError={(error) => actions.onError(getErrorMessage(error))}
                            onImported={async () => {
                                clearFilters();
                                await onImported();
                            }}
                        >
                            {renderCollection()}
                        </SongDropZone>
                    ) : renderCollection()}
                </div>

                {view === "duplicates" && tracks.length > 0 &&
                    <p className="duplicate-note mx-2 mb-0 mt-3.5 shrink-0 text-xs text-muted-foreground">
                        Matches use title, artist, and rounded duration.
                        No files are deleted.
                    </p>
                }
            </div>
        </>
    );
}
