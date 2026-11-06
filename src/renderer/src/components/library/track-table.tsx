import {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useVirtualizer} from "@tanstack/react-virtual";
import {useTable, tableFeatures, columnSizingFeature, columnResizingFeature, columnVisibilityFeature} from "@tanstack/react-table";
import type {ColumnSizingState, ColumnVisibilityState} from "@tanstack/react-table";
import {ArrowDown, ArrowUp, ArrowUpDown, Play, Volume2} from "lucide-react";
import type {Playlist, Track} from "../../../../shared/types/library";
import type {TrackSort, TrackSortField} from "../../../../shared/types/track-sorting";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {TrackContextMenu} from "@/components/library/track-context-menu";
import type {TrackActions} from "@/types/track-actions";
import {cn} from "@/lib/utils";
import {formatTime} from "@/lib/music";
import {ColumnVisibilityMenu} from "@/components/library/column-visibility-menu";
import type {Dispatch, MouseEvent, SetStateAction} from "react";

const features = tableFeatures({ columnSizingFeature, columnResizingFeature, columnVisibilityFeature });
const sizingKey = "btunes.song-columns.v1";
const visibilityKey = "btunes.song-column-visibility.v1";
const columns = [
    { id: "title", enableHiding: false, header: "Title", size: 270, minSize: 180, maxSize: 700 },
    { id: "artist", header: "Artist", size: 160, minSize: 100, maxSize: 500 },
    { id: "album", header: "Album", size: 180, minSize: 110, maxSize: 600 },
    { id: "genre", header: "Genre", size: 130, minSize: 90, maxSize: 400 },
    { id: "duration", header: "Duration", size: 100, minSize: 85, maxSize: 200 },
    { id: "year", header: "Year", size: 85, minSize: 70, maxSize: 180 },
    { id: "plays", header: "Plays", size: 85, minSize: 70, maxSize: 180 },
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

function readColumnVisibility(): ColumnVisibilityState {
    try {
        const stored = JSON.parse(localStorage.getItem(visibilityKey) ?? "{}");
        return Object.fromEntries(columns.map((column) => [column.id, column.id === "title" || stored?.[column.id] !== false]));
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
    onSelect: Dispatch<SetStateAction<number[]>>;
    actions: TrackActions;
}

export const TrackTable = memo(function TrackTable({ tracks, playlists, currentId, playing, selected, sort, onSort, onSelect, actions }: TrackTableProps) {
    "use no memo"; // TanStack Virtual measurements and column resizing update through mutable library state.

    const container = useRef<HTMLDivElement>(null);
    const selectedIds = useMemo(() => new Set(selected), [selected]);
    const selectedTracks = useMemo(() => tracks.filter((track) => selectedIds.has(track.id)), [tracks, selectedIds]);
    const anchorId = useRef<number | undefined>(undefined);
    const getItemKey = useCallback((index: number) => tracks[index].id, [tracks]);
    const [initialSizing] = useState(readColumnSizes);
    const [initialVisibility] = useState(readColumnVisibility);

    const table = useTable({
        features, data: tracks, columns, columnResizeMode: "onEnd",
        initialState: { columnSizing: initialSizing, columnVisibility: initialVisibility },
    }, (state) => ({ columnSizing: state.columnSizing, columnResizing: state.columnResizing, columnVisibility: state.columnVisibility }));

    useEffect(() => {
        try {
            localStorage.setItem(sizingKey, JSON.stringify(table.state.columnSizing));
            localStorage.setItem(visibilityKey, JSON.stringify(table.state.columnVisibility));
        }
        catch {
            // Column resizing still works when persistent storage is unavailable.
        }
    }, [table.state.columnSizing, table.state.columnVisibility]);

    useEffect(() => {
        if (container.current) container.current.scrollTop = 0;
    }, [sort.field, sort.descending]);

    const virtualizer = useVirtualizer({
        count: tracks.length,
        getScrollElement: () => container.current,
        estimateSize: () => 44,
        getItemKey,
        overscan: 8,
        scrollPaddingStart: 44,
    });
    const rows = virtualizer.getVirtualItems();
    const paddingTop = rows[0]?.start ?? 0;
    const paddingBottom = rows.length ? virtualizer.getTotalSize() - rows[rows.length - 1].end : 0;

    const visibleColumns = table.getVisibleLeafColumns();

    function selectRow(index: number, ev: MouseEvent) {
        if ((ev.target as HTMLElement).closest("button")) return;

        const track = tracks[index];
        const additive = ev.ctrlKey || ev.metaKey;

        if (ev.shiftKey) {
            const anchorIndex = tracks.findIndex((item) => item.id === anchorId.current);
            const start = anchorIndex < 0 ? index : anchorIndex;
            const range = tracks.slice(Math.min(start, index), Math.max(start, index) + 1).map((item) => item.id);
            onSelect((previous) => additive ? [...new Set([...previous, ...range])] : range);
            if (anchorIndex < 0) anchorId.current = track.id;
            return;
        }

        anchorId.current = track.id;
        if (additive) {
            onSelect((previous) => previous.includes(track.id) ? previous.filter((id) => id !== track.id) : [...previous, track.id]);
            return;
        }

        onSelect([track.id]);
    }

    function renderCell(track: Track, columnId: string) {
        if (columnId === "title") {
            return (
                <div className="track-cell">
                    <Button size="icon-xs" variant="ghost" className="track-row-play" aria-label={"Play " + track.title} onClick={() => actions.onPlay(track)}>
                        {currentId === track.id && playing ? <Volume2/> : <Play fill="currentColor"/>}
                    </Button>
                    <strong className="truncate" title={track.title}>{track.title}</strong>
                </div>
            );
        }
        if (columnId === "duration") return formatTime(track.duration);
        if (columnId === "genre" && (!track.genre || track.genre === "Uncategorized")) return <span className="missing-tag">No genre</span>;
        if (columnId === "year" && !track.year) return <span className="missing-tag">—</span>;

        return track[columnId as TrackSortField];
    }

    return (
        <div ref={container} className="track-scroll" aria-label="Songs" tabIndex={0}>
            <Table onKeyDown={(ev) => {
                if ((ev.target as HTMLElement).closest("button,input,[role=separator]")) return;
                if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "a") {
                    ev.preventDefault();
                    onSelect(tracks.map((track) => track.id));
                }
                if (ev.key === "Escape") onSelect([]);
            }} className="track-table" aria-rowcount={tracks.length + 1} aria-multiselectable="true" style={{ width: table.getTotalSize(), minWidth: "100%" }}>
                <colgroup>{visibleColumns.map((column) => <col key={column.id} style={{ width: column.getSize() }}/>)}</colgroup>
                <ColumnVisibilityMenu columns={table.getAllLeafColumns().map((column) => ({
                    id: column.id, label: String(column.columnDef.header), visible: column.getIsVisible(), canHide: column.getCanHide(),
                }))} onChange={(id, visible) => table.getColumn(id)?.toggleVisibility(visible)}>
                    <TableHeader tabIndex={0} aria-label="Song columns">
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
                </ColumnVisibilityMenu>
                <TableBody>
                    {paddingTop > 0 &&
                        <TableRow aria-hidden="true" className="virtual-spacer"><TableCell colSpan={visibleColumns.length} style={{ height: paddingTop }}/></TableRow>}
                    {rows.map((row) => {
                        const track = tracks[row.index];
                        const contextTracks = selectedIds.has(track.id) ? selectedTracks : [track];

                        return (
                            <TrackContextMenu key={track.id} tracks={contextTracks} playlists={playlists} actions={actions}>
                                <TableRow data-track-id={track.id} aria-rowindex={row.index + 2} aria-selected={selectedIds.has(track.id)}
                                          className={cn(currentId === track.id && "is-current")}
                                          tabIndex={0}
                                          onClick={(ev) => selectRow(row.index, ev)}
                                          onContextMenu={() => {
                                              if (!selectedIds.has(track.id)) {
                                                  anchorId.current = track.id;
                                                  onSelect([track.id]);
                                              }
                                          }}
                                          onDoubleClick={(ev) => {
                                              if (!(ev.target as HTMLElement).closest("button,input")) actions.onPlay(track);
                                          }}
                                          onKeyDown={(ev) => {
                                              if (ev.key === "Enter" && ev.target === ev.currentTarget) actions.onPlay(track);
                                          }}>
                                    {visibleColumns.map((column) => (
                                        <TableCell key={column.id} data-column={column.id}>
                                            {renderCell(track, column.id)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TrackContextMenu>
                        );
                    })}
                    {paddingBottom > 0 &&
                        <TableRow aria-hidden="true" className="virtual-spacer"><TableCell colSpan={visibleColumns.length} style={{ height: paddingBottom }}/></TableRow>}
                </TableBody>
            </Table>
        </div>
    );
});
