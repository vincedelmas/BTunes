import {useState} from "react";
import {cn} from "@/lib/utils";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import type {ItemReveal} from "@/types/reveal";
import {Check, Pencil, Play} from "lucide-react";
import {albumKey, getAlbumArtist} from "@/lib/music";
import {VirtualGrid} from "@/components/virtual-grid";
import type {TrackActions} from "@/types/track-actions";
import {useListSelection} from "@/hooks/use-list-selection";
import {NowPlayingBadge} from "@/components/player/now-playing-badge";
import type {Playlist, Track} from "../../../../shared/types/library";
import {TrackContextMenu} from "@/components/library/track-context-menu";


interface AlbumGridProps {
    albums: Track[][];
    reveal?: ItemReveal;
    currentTrack?: Track;
    playlists: Playlist[];
    actions: TrackActions;
    onRevealed: () => void;
    onOpen: (tracks: Track[]) => void;
}


export function AlbumGrid({ currentTrack, reveal, onRevealed, albums, playlists, actions, onOpen }: AlbumGridProps) {
    const [selected, setSelected] = useState<string[]>([]);
    const keys = albums.map((tracks) => albumKey(tracks[0]));

    const selectedIds = new Set(selected);
    const selection = useListSelection(keys, selected, setSelected);
    const selectedTracks = albums.filter((tracks) => selectedIds.has(albumKey(tracks[0]))).flat();

    return (
        <VirtualGrid
            items={albums}
            label="Albums"
            reveal={reveal}
            getKey={(tracks) => albumKey(tracks[0])}
            selection={{ keys: selected, onChange: setSelected }}
            onRevealed={() => {
                if (reveal) setSelected([String(reveal.key)]);
                onRevealed();
            }}
            renderItem={(tracks) => {
                const track = tracks[0];
                const key = albumKey(track);
                const isSelected = selectedIds.has(key);
                const contextTracks = isSelected ? selectedTracks : tracks;

                return (
                    <TrackContextMenu actions={actions} playlists={playlists} tracks={contextTracks}>
                        <article
                            tabIndex={0}
                            role="gridcell"
                            data-selection-item
                            data-album-key={key}
                            aria-selected={isSelected}
                            onContextMenu={() => selection.ensureSelected(key)}
                            aria-label={"Open album " + track.album + " by " + getAlbumArtist(track)}
                            aria-current={currentTrack && key === albumKey(currentTrack) ? true : undefined}
                            className={cn("album group relative min-w-0 cursor-pointer select-none rounded-xl border " +
                                "border-transparent p-3 transition-colors hover:bg-accent focus-visible:border-primary " +
                                "focus-visible:outline-none", isSelected && "border-primary bg-selection")}
                            onClick={(ev) => {
                                if ((ev.target as HTMLElement).closest("button")) return;
                                selection.select(key, ev);
                                if (!ev.ctrlKey && !ev.metaKey && !ev.shiftKey) onOpen(tracks);
                            }}
                            onKeyDown={(ev) => {
                                if (ev.target !== ev.currentTarget || (ev.key !== "Enter" && ev.key !== " ")) return;
                                ev.preventDefault();
                                selection.select(key, ev);
                                if (ev.key === "Enter" && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey) onOpen(tracks);
                            }}
                        >
                            <div className="album-artwork relative mb-3 overflow-hidden rounded-lg shadow-lg ring-1 ring-foreground/5">
                                <Cover
                                    large={true}
                                    track={track}
                                />

                                {currentTrack && key === albumKey(currentTrack) &&
                                    <NowPlayingBadge/>
                                }

                                {isSelected &&
                                    <span className="absolute top-2 left-2 flex size-5 items-center justify-center rounded-full
                                    bg-primary text-primary-foreground">
                                        <Check className="size-3"/>
                                    </span>
                                }

                                <Button
                                    size="icon-lg"
                                    aria-label={"Play album " + track.album}
                                    onClick={() => actions.onPlay(track, tracks)}
                                    className="album-play absolute right-2 bottom-2 rounded-full opacity-0 shadow-lg
                                    group-hover:opacity-100 group-focus-within:opacity-100"
                                >
                                    <Play fill="currentColor"/>
                                </Button>
                            </div>
                            <div className="album-info flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <strong title={track.album} className="mb-1 block truncate text-sm font-medium">
                                        {track.album}
                                    </strong>
                                    <span title={getAlbumArtist(track)} className="mb-1 block truncate text-xs text-muted-foreground">
                                        {getAlbumArtist(track)}
                                    </span>
                                    <small className="text-xs text-muted-foreground">
                                        {track.year || "Unknown year"}
                                        {" "}
                                        ·
                                        {" "}
                                        {tracks.length}
                                        {" "}
                                        {tracks.length === 1 ? "song" : "songs"}
                                    </small>
                                </div>
                                <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    aria-label={"Edit tags for album " + track.album}
                                    onClick={() => actions.onEdit(contextTracks)}
                                    className="shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                                >
                                    <Pencil/>
                                </Button>
                            </div>
                        </article>
                    </TrackContextMenu>
                );
            }}
        />
    );
}
