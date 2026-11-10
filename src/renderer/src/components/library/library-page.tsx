import type {ReactNode} from "react";
import {Play, Shuffle} from "lucide-react";
import {PageHeader} from "@/components/page-header";
import {Button} from "@/components/ui/button";
import {AlbumGrid} from "@/components/library/album-grid";
import {ArtistGrid} from "@/components/library/artist-grid";
import {CollectionEmptyState} from "@/components/library/collection-empty-state";
import {FilterBar} from "@/components/library/filter-bar";
import {LibraryStats} from "@/components/library/library-stats";
import {SongDropZone} from "@/components/library/song-drop-zone";
import {TrackTable} from "@/components/library/track-table";
import type {CollectionState} from "@/types/collection";
import type {ItemReveal} from "@/types/reveal";
import type {TrackActions} from "@/types/track-actions";
import type {Snapshot, Track} from "../../../../shared/types/library";
import {getErrorMessage} from "../../../../shared/errors";


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
    feedback: ReactNode;
}


export function LibraryPage({ collection, data, current, playing, actions, reveal, onRevealed, onOpenAlbum, onOpenArtist, onSettings, onImported, onPlay, visualizer, feedback }: LibraryPageProps) {
    const {view, title, tracks, albums, sort, selected, search, artist, setSort, setSelected, setArtist, clearFilters} = collection;

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
            <div className="library-hero shrink-0 border-b border-primary/15 px-5 pb-4 pt-5">
                <PageHeader
                    title={title}
                    visualizer={visualizer}
                    details={<LibraryStats tracks={tracks}/>}
                    actions={<>
                        <Button disabled={!tracks.length} onClick={() => onPlay(false)}>
                            <Play data-icon="inline-start" fill="currentColor"/>
                            Play all
                        </Button>
                        <Button variant="secondary" disabled={!tracks.length} onClick={() => onPlay(true)}>
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
