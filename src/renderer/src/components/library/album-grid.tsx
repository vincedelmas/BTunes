import {useState} from "react";
import {Check, Pencil, Play, X} from "lucide-react";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import {VirtualGrid} from "@/components/virtual-grid";
import {TrackContextMenu} from "@/components/library/track-context-menu";
import {useListSelection} from "@/hooks/use-list-selection";
import {albumKey, getAlbumArtist} from "@/lib/music";
import {cn} from "@/lib/utils";
import type {TrackActions} from "@/types/track-actions";
import type {Playlist, Track} from "../../../../shared/types/library";

interface AlbumGridProps {
    albums: Track[][];
    playlists: Playlist[];
    actions: TrackActions;
    onOpen: (tracks: Track[]) => void;
}


export function AlbumGrid({ albums, playlists, actions, onOpen }: AlbumGridProps) {
    const [selected, setSelected] = useState<string[]>([]);
    const keys = albums.map((tracks) => albumKey(tracks[0]));
    const selection = useListSelection(keys, selected, setSelected);
    const selectedIds = new Set(selected);
    const selectedAlbums = albums.filter((tracks) => selectedIds.has(albumKey(tracks[0])));
    const selectedTracks = selectedAlbums.flat();

    return (
        <div className="relative flex min-h-0 flex-1 flex-col">
            {selectedAlbums.length > 0 && (
                <div
                    className="absolute right-3 bottom-3 left-3 z-20 flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 shadow-xl"
                    aria-label="Selected albums"
                >
                    <p className="mr-auto text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{selectedAlbums.length} {selectedAlbums.length === 1 ? "album" : "albums"}</span>
                        {" · " + selectedTracks.length + " songs selected"}
                    </p>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => actions.onEdit(selectedTracks)}
                    >
                        <Pencil data-icon="inline-start"/>
                        Edit tags
                    </Button>
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Clear album selection"
                        onClick={() => setSelected([])}
                    >
                        <X/>
                    </Button>
                </div>
            )}
            <VirtualGrid
                items={albums}
                label="Albums"
                getKey={(tracks) => albumKey(tracks[0])}
                selection={{ keys: selected, onChange: setSelected }}
                renderItem={(tracks) => {
                    const track = tracks[0];
                    const key = albumKey(track);
                    const isSelected = selectedIds.has(key);
                    const contextTracks = isSelected ? selectedTracks : tracks;

                    return (
                        <TrackContextMenu
                            tracks={contextTracks}
                            playlists={playlists}
                            actions={actions}
                        >
                            <article
                                data-selection-item
                                data-album-key={key}
                                role="gridcell"
                                tabIndex={0}
                                aria-label={"Open album " + track.album + " by " + getAlbumArtist(track)}
                                aria-selected={isSelected}
                                className={cn("album group relative min-w-0 cursor-pointer select-none rounded-xl border border-transparent p-3 hover:bg-card focus-visible:border-primary focus-visible:outline-none", isSelected && "border-primary/60 bg-primary/5")}
                                onClick={(ev) => {
                                    if ((ev.target as HTMLElement).closest("button")) return;
                                    selection.select(key, ev);
                                    if (!ev.ctrlKey && !ev.metaKey && !ev.shiftKey) onOpen(tracks);
                                }}
                                onContextMenu={() => selection.ensureSelected(key)}
                                onKeyDown={(ev) => {
                                    if (ev.target !== ev.currentTarget || (ev.key !== "Enter" && ev.key !== " ")) return;
                                    ev.preventDefault();
                                    selection.select(key, ev);
                                    if (ev.key === "Enter" && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey) onOpen(tracks);
                                }}
                            >
                                <div className="album-artwork relative mb-3 overflow-hidden rounded-lg shadow-lg">
                                    <Cover
                                        large
                                        track={track}
                                    />
                                    {isSelected && <span className="absolute top-2 left-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
<Check className="size-3"/>
</span>}
                                    <Button
                                        size="icon-lg"
                                        className="album-play absolute right-2 bottom-2 rounded-full opacity-0 shadow-lg group-hover:opacity-100 group-focus-within:opacity-100"
                                        aria-label={"Play album " + track.album}
                                        onClick={() => actions.onPlay(track, tracks)}
                                    >
                                        <Play fill="currentColor"/>
                                    </Button>
                                </div>
                                <div className="album-info flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <strong
                                            className="mb-1 block truncate text-sm font-semibold"
                                            title={track.album}
                                        >{track.album}</strong>
                                        <span
                                            className="mb-1 block truncate text-xs text-muted-foreground"
                                            title={getAlbumArtist(track)}
                                        >{getAlbumArtist(track)}</span>
                                        <small className="text-[11px] text-muted-foreground">{track.year || "Unknown year"} · {tracks.length} songs</small>
                                    </div>
                                    <Button
                                        size="icon-xs"
                                        variant="ghost"
                                        className="shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                                        onClick={() => actions.onEdit(contextTracks)}
                                        aria-label={"Edit tags for album " + track.album}
                                    >
                                        <Pencil/>
                                    </Button>
                                </div>
                            </article>
                        </TrackContextMenu>
                    );
                }}
            />
        </div>
    );
}
