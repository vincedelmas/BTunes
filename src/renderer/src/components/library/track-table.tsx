import {memo, useCallback, useEffect, useMemo, useRef} from "react";
import {useVirtualizer} from "@tanstack/react-virtual";
import {useTable, tableFeatures, columnSizingFeature, columnResizingFeature, type ColumnSizingState} from "@tanstack/react-table";
import {ArrowDown, ArrowUp, ArrowUpDown, Pencil, Play, Volume2} from "lucide-react";
import type {Playlist, Track} from "../../../../shared/contracts";
import type {TrackSort, TrackSortField} from "../../../../shared/track-sorting";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {TrackContextMenu, type TrackActions} from "@/components/library/track-context-menu";
import {cn} from "@/lib/utils";
import {formatTime} from "@/lib/music";

const features = tableFeatures({ columnSizingFeature, columnResizingFeature });
const sizingKey = "btunes.song-columns.v1";
const columns = [
    { id: "selection", header: "", size: 36, minSize: 36, maxSize: 36, enableResizing: false },
    { id: "title", header: "Title", size: 270, minSize: 180, maxSize: 700 },
    { id: "artist", header: "Artist", size: 160, minSize: 100, maxSize: 500 },
    { id: "album", header: "Album", size: 180, minSize: 110, maxSize: 600 },
    { id: "genre", header: "Genre", size: 130, minSize: 90, maxSize: 400 },
    { id: "duration", header: "Duration", size: 100, minSize: 85, maxSize: 200 },
    { id: "year", header: "Year", size: 85, minSize: 70, maxSize: 180 },
    { id: "plays", header: "Plays", size: 85, minSize: 70, maxSize: 180 },
    { id: "actions", header: "", size: 44, minSize: 44, maxSize: 44, enableResizing: false },
];

function readColumnSizes(): ColumnSizingState {
    try {
        const stored = JSON.parse(localStorage.getItem(sizingKey) ?? "{}");
        const sizes: ColumnSizingState = {};

        for (const column of columns) {
            const size = stored?.[column.id];
            if (Number.isFinite(size)) sizes[column.id] = Math.max(column.minSize, Math.min(column.maxSize, size));
        }

        return sizes;
    }
    catch {
        return {};
    }
}

interface TrackTableProps {
    tracks: Track[];
    playlists: Playlist[];
    currentId?: number;
    playing: boolean;
    selected: number[];
    sort: TrackSort;
    onSort: (sort: TrackSort) => void;
    onSelect: (ids: number[]) => void;
    actions: TrackActions;
}

export const TrackTable = memo(function TrackTable({ tracks, playlists, currentId, playing, selected, sort, onSort, onSelect, actions }: TrackTableProps) {
    const container = useRef<HTMLDivElement>(null);
    const selectedIds = useMemo(() => new Set(selected), [selected]);
    const selectedTracks = useMemo(() => tracks.filter((track) => selectedIds.has(track.id)), [tracks, selectedIds]);
    const allSelected = tracks.length > 0 && selectedTracks.length === tracks.length;
    const getItemKey = useCallback((index: number) => tracks[index].id, [tracks]);
    const initialSizing = useMemo(readColumnSizes, []);

    const table = useTable({
        features, data: tracks, columns, columnResizeMode: "onEnd",
        initialState: { columnSizing: initialSizing },
    }, (state) => ({ columnSizing: state.columnSizing, columnResizing: state.columnResizing }));

    useEffect(() => {
        try {
            localStorage.setItem(sizingKey, JSON.stringify(table.state.columnSizing));
        }
        catch {
            // Column resizing still works when persistent storage is unavailable.
        }
    }, [table.state.columnSizing]);

    useEffect(() => {
        if (container.current) container.current.scrollTop = 0;
    }, [sort.field, sort.descending]);

    const virtualizer = useVirtualizer({
        count: tracks.length,
        getScrollElement: () => container.current,
        estimateSize: () => 64,
        getItemKey,
        overscan: 8,
        scrollPaddingStart: 44,
    });
    const rows = virtualizer.getVirtualItems();
    const paddingTop = rows[0]?.start ?? 0;
    const paddingBottom = rows.length ? virtualizer.getTotalSize() - rows[rows.length - 1].end : 0;

    function toggleSelection(track: Track, checked: boolean) {
        onSelect(checked ? [...selectedIds, track.id] : selected.filter((id) => id !== track.id));
    }

    return (
        <div ref={container} className="track-scroll" aria-label="Songs" tabIndex={0}>
            <Table className="track-table" aria-rowcount={tracks.length + 1} style={{ width: table.getTotalSize() }}>
                <colgroup>{table.getAllLeafColumns().map((column) => <col key={column.id} style={{ width: column.getSize() }}/>)}</colgroup>
                <TableHeader>
                    {table.getHeaderGroups().map((group) => <TableRow key={group.id}>
                        {group.headers.map((header) => {
                            const column = header.column;
                            const field = column.id as TrackSortField;
                            const active = sort.field === field;
                            const resizable = column.getCanResize();
                            const direction = sort.descending ? "descending" : "ascending";
                            const SortIcon = sort.descending ? ArrowDown : ArrowUp;

                            return (
                                <TableHead key={header.id} data-column={column.id} aria-sort={resizable && active ? direction : undefined}>
                                    {column.id === "selection" && <input type="checkbox" checked={allSelected} aria-label="Select all filtered songs"
                                                                         onChange={(ev) => onSelect(ev.target.checked ? tracks.map((track) => track.id) : [])}/>}
                                    {column.id === "actions" && <span className="sr-only">Actions</span>}
                                    {resizable && <>
                                        <button className={cn("column-sort", active && "is-sorted")} aria-label={"Sort by " + String(column.columnDef.header)}
                                                onClick={() => onSort({ field, descending: active ? !sort.descending : false })}>
                                            <span>{String(column.columnDef.header)}</span>
                                            {active ? <SortIcon/> : <ArrowUpDown/>}
                                        </button>
                                        <div role="separator" tabIndex={0} aria-orientation="vertical" aria-label={"Resize " + String(column.columnDef.header) + " column"}
                                             aria-valuemin={column.columnDef.minSize} aria-valuemax={column.columnDef.maxSize} aria-valuenow={column.getSize()}
                                             title="Drag to resize. Double-click to reset."
                                             className={cn("column-resizer", column.getIsResizing() && "is-resizing")}
                                             onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()}
                                             onDoubleClick={() => column.resetSize()}
                                             onKeyDown={(ev) => {
                                                 if (ev.key === "Home") {
                                                     ev.preventDefault();
                                                     column.resetSize();
                                                     return;
                                                 }
                                                 if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
                                                 ev.preventDefault();
                                                 const delta = ev.key === "ArrowRight" ? 16 : -16;
                                                 table.setColumnSizing((previous) => ({
                                                     ...previous,
                                                     [column.id]: Math.max(column.columnDef.minSize ?? 50, Math.min(column.columnDef.maxSize ?? 700, column.getSize() + delta))
                                                 }));
                                             }}
                                             style={{ transform: column.getIsResizing() ? "translateX(" + (table.state.columnResizing.deltaOffset ?? 0) + "px)" : undefined }}
                                        />
                                    </>}
                                </TableHead>
                            );
                        })}
                    </TableRow>)}
                </TableHeader>
                <TableBody>
                    {paddingTop > 0 && <TableRow aria-hidden="true" className="virtual-spacer"><TableCell colSpan={columns.length} style={{ height: paddingTop }}/></TableRow>}
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
                                          }}>
                                    <TableCell><input type="checkbox" aria-label={"Select " + track.title} checked={selectedIds.has(track.id)}
                                                      onChange={(ev) => toggleSelection(track, ev.target.checked)}/></TableCell>
                                    <TableCell>
                                        <div className="track-cell">
                                            <div className="track-artwork"><Cover track={track}/>
                                                <Button size="icon" variant="ghost" className="track-artwork-play" aria-label={"Play " + track.title}
                                                        onClick={() => actions.onPlay(track)}>
                                                    {currentId === track.id && playing ? <Volume2/> : <Play fill="currentColor"/>}
                                                </Button>
                                            </div>
                                            <strong className="truncate" title={track.title}>{track.title}</strong>
                                        </div>
                                    </TableCell>
                                    <TableCell title={track.artist}>{track.artist}</TableCell>
                                    <TableCell title={track.album}>{track.album}</TableCell>
                                    <TableCell title={track.genre}>{!track.genre || track.genre === "Uncategorized" ?
                                        <span className="missing-tag">No genre</span> : track.genre}</TableCell>
                                    <TableCell>{formatTime(track.duration)}</TableCell>
                                    <TableCell>{track.year || <span className="missing-tag">—</span>}</TableCell>
                                    <TableCell>{track.plays}</TableCell>
                                    <TableCell><Button size="icon" variant="ghost" onClick={() => actions.onEdit([track])}
                                                       aria-label={"Edit tags for " + track.title}><Pencil/></Button></TableCell>
                                </TableRow>
                            </TrackContextMenu>
                        );
                    })}
                    {paddingBottom > 0 &&
                        <TableRow aria-hidden="true" className="virtual-spacer"><TableCell colSpan={columns.length} style={{ height: paddingBottom }}/></TableRow>}
                </TableBody>
            </Table>
        </div>
    );
});
