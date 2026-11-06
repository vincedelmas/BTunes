import {memo, useCallback, useMemo, useRef} from "react";
import {useVirtualizer} from "@tanstack/react-virtual";
import {Pencil, Play, Volume2} from "lucide-react";
import type {Playlist, Track} from "../../../../shared/contracts";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {TrackContextMenu, type TrackActions} from "@/components/library/track-context-menu";
import {cn} from "@/lib/utils";
import {formatTime} from "@/lib/music";

interface TrackTableProps {
    tracks: Track[];
    playlists: Playlist[];
    currentId?: number;
    playing: boolean;
    selected: number[];
    onSelect: (ids: number[]) => void;
    actions: TrackActions;
}

export const TrackTable = memo(function TrackTable({ tracks, playlists, currentId, playing, selected, onSelect, actions }: TrackTableProps) {
    const container = useRef<HTMLDivElement>(null);
    const selectedIds = useMemo(() => new Set(selected), [selected]);
    const selectedTracks = useMemo(() => tracks.filter((track) => selectedIds.has(track.id)), [tracks, selectedIds]);
    const allSelected = tracks.length > 0 && selectedTracks.length === tracks.length;
    const getItemKey = useCallback((index: number) => tracks[index].id, [tracks]);

    const virtualizer = useVirtualizer({
        count: tracks.length,
        getScrollElement: () => container.current,
        estimateSize: () => 64,
        getItemKey,
        overscan: 8,
        scrollPaddingStart: 42,
    });
    const rows = virtualizer.getVirtualItems();
    const paddingTop = rows[0]?.start ?? 0;
    const paddingBottom = rows.length ? virtualizer.getTotalSize() - rows[rows.length - 1].end : 0;

    function toggleSelection(track: Track, checked: boolean) {
        onSelect(checked ? [...selectedIds, track.id] : selected.filter((id) => id !== track.id));
    }

    return (
        <div ref={container} className="track-scroll" aria-label="Songs" tabIndex={0}>
            <Table className="track-table" aria-rowcount={tracks.length + 1}>
                <colgroup>
                    <col style={{ width: 36 }}/>
                    <col style={{ width: 44 }}/>
                    <col/>
                    <col style={{ width: "22%" }}/>
                    <col style={{ width: "12%" }}/>
                    <col style={{ width: 65 }}/>
                    <col style={{ width: 44 }}/>
                </colgroup>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                            <input type="checkbox" checked={allSelected} aria-label="Select all filtered songs"
                                   onChange={(ev) => onSelect(ev.target.checked ? tracks.map((track) => track.id) : [])}/>
                        </TableHead>
                        <TableHead>#</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Album</TableHead>
                        <TableHead>Genre</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paddingTop > 0 && <TableRow aria-hidden="true" className="virtual-spacer">
                        <TableCell colSpan={7} style={{ height: paddingTop }}/>
                    </TableRow>}
                    {rows.map((row) => {
                        const track = tracks[row.index];
                        const contextTracks = selectedIds.has(track.id) ? selectedTracks : [track];

                        return (
                            <TrackContextMenu key={track.id} tracks={contextTracks} playlists={playlists} actions={actions}>
                                <TableRow data-track-id={track.id} aria-rowindex={row.index + 2} aria-selected={selectedIds.has(track.id)}
                                          className={cn(currentId === track.id && "is-current")}
                                          onDoubleClick={(ev) => {
                                              if (!(ev.target as HTMLElement).closest("button,input")) actions.onPlay(track);
                                          }}
                                          onKeyDown={(ev) => {
                                              if (ev.key === "Enter" && ev.target === ev.currentTarget) actions.onPlay(track);
                                          }}
                                >
                                    <TableCell>
                                        <input type="checkbox" aria-label={"Select " + track.title} checked={selectedIds.has(track.id)}
                                               onChange={(ev) => toggleSelection(track, ev.target.checked)}/>
                                    </TableCell>
                                    <TableCell>
                                        <Button size="icon" variant="ghost" aria-label={"Play " + track.title}
                                                onClick={() => actions.onPlay(track)}>{currentId === track.id && playing ? <Volume2/> : <Play/>}</Button>
                                    </TableCell>
                                    <TableCell>
                                        <div className="track-cell">
                                            <Cover track={track}/>
                                            <div className="track-description">
                                                <strong title={track.title}>{track.title}</strong>
                                                <small title={track.artist}>{track.artist}</small>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell title={track.album}>{track.album}</TableCell>
                                    <TableCell title={track.genre}>{track.genre}</TableCell>
                                    <TableCell>{formatTime(track.duration)}</TableCell>
                                    <TableCell>
                                        <Button size="icon" variant="ghost" onClick={() => actions.onEdit([track])} aria-label={"Edit tags for " + track.title}>
                                            <Pencil/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            </TrackContextMenu>
                        );
                    })}
                    {paddingBottom > 0 && <TableRow aria-hidden="true" className="virtual-spacer">
                        <TableCell colSpan={7} style={{ height: paddingBottom }}/>
                    </TableRow>}
                </TableBody>
            </Table>
        </div>
    );
});
