import {cn} from "@/lib/utils";
import {useItemReveal} from "@/hooks/use-item-reveal";
import {ShowPlayingButton} from "@/components/player/show-playing-button";
import {useState} from "react";
import {Cover} from "@/components/cover";
import {Pencil, Play} from "lucide-react";
import {getAlbumArtist} from "@/lib/music";
import {Button} from "@/components/ui/button";
import {TagEditor} from "@/components/tag-editor";
import type {TrackActions} from "@/types/track-actions";
import {TrackTable} from "@/components/library/track-table";
import {compareTracks} from "../../../../shared/track-sorting";
import {LibraryStats} from "@/components/library/library-stats";
import type {TrackSort} from "../../../../shared/types/track-sorting";
import type {Playlist, Track} from "../../../../shared/types/library";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";


interface TrackCollectionDialogProps {
    tracks: Track[];
    artistName?: string;
    genres: string[];
    playing: boolean;
    currentId?: number;
    onClose: () => void;
    playlists: Playlist[];
    actions: TrackActions;
    onSaved: () => Promise<void>;
}


export function TrackCollectionDialog({ artistName, genres, tracks, playlists, actions, currentId, playing, onClose, onSaved }: TrackCollectionDialogProps) {
    const [editing, setEditing] = useState<Track[]>();
    const [selected, setSelected] = useState<number[]>([]);
    const locator = useItemReveal();
    const [sort, setSort] = useState<TrackSort>({ field: "title", descending: false });

    const first = tracks[0];
    const editLabel = artistName ? "Edit artist tags" : "Edit album tags";
    const selectedIds = new Set(selected);
    const selectedTracks = tracks.filter((track) => selectedIds.has(track.id));
    const orderedTracks = [...tracks].sort((first, second) => compareTracks(first, second, sort));

    const collectionActions: TrackActions = {
        ...actions,
        onEdit: setEditing,
        onRemove: undefined,
        onPlay: (track, list = orderedTracks) => actions.onPlay(track, list),
        onAlbum: (track) => {
            onClose();
            actions.onAlbum(track);
        },
        onArtist: (artist) => {
            onClose();
            actions.onArtist(artist);
        },
    };

    return (
        <Dialog
            open={true}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent
                className={cn("collection-dialog flex h-[min(760px,88vh)] w-[calc(100vw-64px)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl", artistName ? "artist-dialog" : "album-dialog")}
            >
                <DialogHeader className="shrink-0 bg-linear-to-br from-primary/10 to-card p-6">
                    <div className="flex items-center gap-5">
                        <div className="shrink-0 [&_.cover]:size-24 [&_.cover]:rounded-lg">
                            <Cover track={first}/>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                {artistName ? "Artist" : "Album"}
                            </p>
                            <DialogTitle className="truncate text-2xl font-semibold">
                                {artistName ?? first.album}
                            </DialogTitle>
                            <DialogDescription className="mt-2 truncate">
                                {artistName ? "Songs in your library" : getAlbumArtist(first)}
                            </DialogDescription>

                            <LibraryStats
                                tracks={tracks}
                                className="mt-3"
                            />
                        </div>
                    </div>
                </DialogHeader>
                <div className="flex shrink-0 items-center gap-2 border-b border-border px-5 py-3">
                    <Button onClick={() => actions.onPlay(orderedTracks[0], orderedTracks)}>
                        <Play
                            data-icon="inline-start"
                            fill="currentColor"
                        />
                        {artistName ? "Play artist" : "Play album"}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setEditing(selectedTracks.length ? selectedTracks : tracks)}
                    >
                        <Pencil data-icon="inline-start"/>
                        {selectedTracks.length ? "Edit selected songs" : editLabel}
                    </Button>

                    <div className="ml-auto flex items-center gap-3">
                        {selectedTracks.length > 0 && <p className="text-xs text-muted-foreground">{selectedTracks.length} selected</p>}
                        <ShowPlayingButton
                            disabled={!tracks.some((track) => track.id === currentId)}
                            onClick={() => {
                                if (currentId) locator.show(currentId);
                            }}
                        />
                    </div>
                </div>
                <div className="min-h-0 flex-1 px-4 pb-4">
                    <TrackTable
                        sort={sort}
                        onSort={setSort}
                        playing={playing}
                        selected={selected}
                        playlists={playlists}
                        currentId={currentId}
                        reveal={locator.target}
                        onRevealed={locator.clear}
                        tracks={orderedTracks}
                        actions={collectionActions}
                        onSelect={setSelected}
                    />
                </div>
                {editing &&
                    <TagEditor
                        genres={genres}
                        tracks={editing}
                        onSaved={onSaved}
                        onClose={() => setEditing(undefined)}
                    />
                }
            </DialogContent>
        </Dialog>
    );
}
