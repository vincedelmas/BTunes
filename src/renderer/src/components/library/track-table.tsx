import {cn} from "@/lib/utils";
import {formatTime} from "@/lib/music";
import {Cover} from "@/components/cover";
import {Play, Volume2} from "lucide-react";
import {Button} from "@/components/ui/button";
import type {ItemReveal} from "@/types/reveal";
import {useTable} from "@tanstack/react-table";
import {normalizeOrder} from "@/lib/preferences";
import {useDragOrder} from "@/hooks/use-drag-order";
import type {Dispatch, SetStateAction} from "react";
import {usePreference} from "@/hooks/use-preference";
import {useVirtualizer} from "@tanstack/react-virtual";
import type {TrackActions} from "@/types/track-actions";
import {useListSelection} from "@/hooks/use-list-selection";
import type {Playlist, Track} from "../../../../shared/types/library";
import {itemOrderSchema} from "../../../../shared/schemas/preferences";
import {TrackContextMenu} from "@/components/library/track-context-menu";
import {SongColumnHeader} from "@/components/library/song-column-header";
import {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {ColumnVisibilityMenu} from "@/components/library/column-visibility-menu";
import type {ColumnSizingState, ColumnVisibilityState} from "@tanstack/react-table";
import type {TrackSort, TrackSortField} from "../../../../shared/types/track-sorting";
import {Table, TableBody, TableCell, TableHeader, TableRow} from "@/components/ui/table";
import {songColumns as columns, songTableFeatures as features} from "@/lib/song-columns";

const sizingKey = "btunes.song-columns.v1";
const visibilityKey = "btunes.song-column-visibility.v1";

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
        return Object.fromEntries(columns.map((column) => [column.id, column.id === "title" || (stored?.[column.id] ?? (column.id !== "albumArtist" && column.id !== "artwork"))]));
    }
    catch {
        return { albumArtist: false, artwork: false };
    }
}


interface TrackTableProps {
    tracks: Track[];
    sort: TrackSort;
    playing: boolean;
    currentId?: number;
    selected: number[];
    reveal?: ItemReveal;
    playlists: Playlist[];
    actions: TrackActions;
    onRevealed?: () => void;
    onSort: (sort: TrackSort) => void;
    onSelect: Dispatch<SetStateAction<number[]>>;
}


export const TrackTable = memo(function TrackTable({ reveal, onRevealed, tracks, playlists, currentId, playing, selected, sort, onSort, onSelect, actions }: TrackTableProps) {
    "use no memo"; // TanStack Virtual measurements and column resizing update through mutable library state.

    const container = useRef<HTMLDivElement>(null);
    const selectedIds = useMemo(() => new Set(selected), [selected]);
    const selectedTracks = useMemo(() => tracks.filter((track) => selectedIds.has(track.id)), [tracks, selectedIds]);
    const selection = useListSelection(tracks.map((track) => track.id), selected, onSelect);
    const getItemKey = useCallback((index: number) => tracks[index].id, [tracks]);
    const [savedOrder, setOrder] = usePreference("btunes.song-column-order.v1", itemOrderSchema, columns.map((column) => column.id));
    const order = useMemo(() => normalizeOrder(savedOrder, columns.map((column) => column.id)), [savedOrder]);
    const reordering = useDragOrder(order, setOrder, "columns");
    const [initialSizing] = useState(readColumnSizes);
    const [initialVisibility] = useState(readColumnVisibility);

    const table = useTable({
        features, data: tracks, columns, columnResizeMode: "onEnd",
        initialState: { columnSizing: initialSizing, columnVisibility: initialVisibility },
    }, (state) => ({ columnSizing: state.columnSizing, columnResizing: state.columnResizing, columnVisibility: state.columnVisibility, columnOrder: state.columnOrder }));

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

    const rowHeight = table.getColumn("artwork")?.getIsVisible() ? 48 : 36;
    const virtualizer = useVirtualizer({
        count: tracks.length,
        getScrollElement: () => container.current,
        estimateSize: () => rowHeight,
        getItemKey,
        overscan: 8,
        scrollPaddingStart: 36,
    });
    useEffect(() => {
        virtualizer.measure();
    }, [virtualizer, rowHeight]);

    const rows = virtualizer.getVirtualItems();
    const paddingTop = rows[0]?.start ?? 0;
    const paddingBottom = rows.length ? virtualizer.getTotalSize() - rows[rows.length - 1].end : 0;

    useEffect(() => table.setColumnOrder(order), [table, order]);

    const visibleColumns = table.getVisibleLeafColumns();

    const revealIndex = reveal ? tracks.findIndex((track) => track.id === reveal.key) : -1;

    useEffect(() => {
        if (revealIndex < 0) return;
        virtualizer.scrollToIndex(revealIndex, { align: "center" });
        if (reveal?.select !== false) onSelect([tracks[revealIndex].id]);
        onRevealed?.();
    }, [reveal?.request, reveal?.select, revealIndex, tracks, virtualizer, onSelect, onRevealed]);

    function renderCell(track: Track, columnId: string) {
        if (columnId === "artwork") {
            return (
                <div className="flex justify-center [&_.cover]:size-9 [&_.cover]:rounded [&_.cover_svg]:size-4">
                    <Cover track={track}/>
                </div>
            );
        }

        if (columnId === "title") {
            return (
                <div
                    className="track-cell flex items-center gap-3 min-w-0 [&_strong]:text-foreground [&_strong]:font-medium [&_strong]:text-[13px] [&_strong]:min-w-0"
                >
                    <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={"Play " + track.title}
                        onClick={() => actions.onPlay(track)}
                        className="track-row-play size-6 shrink-0 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 [&_svg]:w-[14px] [&_svg]:h-[14px]"
                    >
                        {currentId === track.id && playing ? (
                            <Volume2/>
                        ) : (
                            <Play fill="currentColor"/>
                        )}
                    </Button>
                    <strong
                        title={track.title}
                        className="truncate"
                    >
                        {track.title}
                    </strong>
                </div>
            );
        }
        if (columnId === "duration") return formatTime(track.duration);
        if (columnId === "albumArtist" && !track.albumArtist) {
            return (
                <span className="text-muted-foreground">
                    —
                </span>
            );
        }
        if (columnId === "genre" && (!track.genre || track.genre === "Uncategorized")) {
            return (
                <span className="missing-tag text-muted-foreground">
                    No genre
                </span>
            );
        }
        if (columnId === "year" && !track.year) {
            return (
                <span className="missing-tag text-muted-foreground">
                    —
                </span>
            );
        }

        return track[columnId as TrackSortField];
    }

    return (
        <div
            tabIndex={0}
            ref={container}
            aria-label="Songs"
            className="track-scroll h-full min-h-0 overflow-auto overscroll-contain outline-none focus-visible:outline-1 focus-visible:outline-primary focus-visible:-outline-offset-1 [scrollbar-gutter:stable] overflow-x-hidden [&_[data-slot=table-container]]:overflow-visible"
        >
            <Table
                style={{ width: "100%" }}
                aria-multiselectable="true"
                aria-rowcount={tracks.length + 1}
                className="track-table w-full table-fixed border-collapse text-left text-xs"
                onKeyDown={(ev) => {
                    if ((ev.target as HTMLElement).closest("button,input,[role=separator]")) return;
                    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "a") {
                        ev.preventDefault();
                        onSelect(tracks.map((track) => track.id));
                    }
                    if (ev.key === "Escape") onSelect([]);
                }}
            >
                <colgroup>
                    {visibleColumns.map((column) => (
                        <col
                            key={column.id}
                            style={{ width: (column.getSize() / table.getTotalSize()) * 100 + "%" }}
                        />
                    ))}
                </colgroup>
                <ColumnVisibilityMenu
                    onChange={(id, visible) => table.getColumn(id)?.toggleVisibility(visible)}
                    columns={table.getAllLeafColumns().map((column) => ({
                        id: column.id, label: String(column.columnDef.header), visible: column.getIsVisible(), canHide: column.getCanHide(),
                    }))}
                >
                    <TableHeader
                        tabIndex={0}
                        aria-label="Song columns"
                        className="sticky top-0 z-10 bg-card"
                    >
                        {table.getHeaderGroups().map((group) => (
                            <TableRow key={group.id}>
                                {group.headers.map((header) => (
                                    <SongColumnHeader
                                        sort={sort}
                                        key={header.id}
                                        header={header}
                                        onSort={onSort}
                                        reordering={reordering}
                                        resizeOffset={table.state.columnResizing.deltaOffset ?? 0}
                                    />
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                </ColumnVisibilityMenu>
                <TableBody className="[&_tr]:select-none">
                    {paddingTop > 0 && (
                        <TableRow
                            aria-hidden="true"
                            className="virtual-spacer border-0 bg-transparent hover:bg-transparent"
                        >
                            <TableCell
                                className="border-0 p-0"
                                style={{ height: paddingTop }}
                                colSpan={visibleColumns.length}
                            />
                        </TableRow>
                    )}
                    {rows.map((row) => {
                        const track = tracks[row.index];
                        const contextTracks = selectedIds.has(track.id) ? selectedTracks : [track];

                        return (
                            <TrackContextMenu
                                key={track.id}
                                actions={actions}
                                playlists={playlists}
                                tracks={contextTracks}
                            >
                                <TableRow
                                    tabIndex={0}
                                    data-track-id={track.id}
                                    aria-rowindex={row.index + 2}
                                    style={{ height: rowHeight }}
                                    aria-selected={selectedIds.has(track.id)}
                                    onContextMenu={() => selection.ensureSelected(track.id)}
                                    onClick={(ev) => {
                                        if (!(ev.target as HTMLElement).closest("button")) selection.select(track.id, ev);
                                    }}
                                    onKeyDown={(ev) => {
                                        if (ev.key === "Enter" && ev.target === ev.currentTarget) actions.onPlay(track);
                                    }}
                                    onDoubleClick={(ev) => {
                                        if (!(ev.target as HTMLElement).closest("button,input")) actions.onPlay(track);
                                    }}
                                    className={cn("group border-border/60 hover:bg-accent aria-selected:bg-selection aria-selected:shadow-[inset_3px_0_0_var(--primary)]", currentId === track.id && "is-current text-primary [&_.track-cell_strong]:text-primary [&_.track-row-play]:opacity-100")}
                                >
                                    {visibleColumns.map((column) => (
                                        <TableCell
                                            key={column.id}
                                            data-column={column.id}
                                            className="min-w-0 truncate px-2 py-1 text-sm text-content tabular-nums"
                                        >
                                            {renderCell(track, column.id)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TrackContextMenu>
                        );
                    })}
                    {paddingBottom > 0 && (
                        <TableRow
                            aria-hidden="true"
                            className="virtual-spacer border-0 bg-transparent hover:bg-transparent"
                        >
                            <TableCell
                                className="border-0 p-0"
                                colSpan={visibleColumns.length}
                                style={{ height: paddingBottom }}
                            />
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
});
