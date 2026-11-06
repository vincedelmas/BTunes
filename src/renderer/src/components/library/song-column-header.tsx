import type {Header} from "@tanstack/react-table";
import type {KeyboardEvent} from "react";
import {ArrowDown, ArrowUp, ArrowUpDown} from "lucide-react";
import type {Track} from "../../../../shared/types/library";
import type {TrackSort, TrackSortField} from "../../../../shared/types/track-sorting";
import type {songTableFeatures} from "@/lib/song-columns";
import type {useDragOrder} from "@/hooks/use-drag-order";
import {TableHead} from "@/components/ui/table";
import {ReorderHandle} from "@/components/reorder-handle";
import {cn} from "@/lib/utils";

interface SongColumnHeaderProps {
    header: Header<typeof songTableFeatures, Track>;
    sort: TrackSort;
    onSort: (sort: TrackSort) => void;
    reordering: ReturnType<typeof useDragOrder>;
    resizeOffset: number;
}

export function SongColumnHeader({ header, sort, onSort, reordering, resizeOffset }: SongColumnHeaderProps) {
    "use no memo"; // Read current TanStack sizing values on every table update.

    const column = header.column;
    const field = column.id as TrackSortField;
    const label = String(column.columnDef.header);
    const active = sort.field === field;
    const direction = sort.descending ? "descending" : "ascending";
    const SortIcon = sort.descending ? ArrowDown : ArrowUp;

    function resizeWithKeys(ev: KeyboardEvent) {
        if (ev.key === "Home") {
            ev.preventDefault();
            column.resetSize();
            return;
        }
        if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;

        ev.preventDefault();
        const delta = ev.key === "ArrowRight" ? 16 : -16;
        const size = Math.max(column.columnDef.minSize ?? 50, Math.min(column.columnDef.maxSize ?? 700, column.getSize() + delta));
        column.table.setColumnSizing((previous) => ({ ...previous, [column.id]: size }));
    }

    return (
        <TableHead
            data-column={column.id}
            onDragOver={reordering.over}
            onDrop={(ev) => reordering.drop(ev, column.id)}
            data-dragging={reordering.dragging === column.id || undefined}
            aria-sort={active ? direction : undefined}
        >
            <ReorderHandle
                label={"Move " + label + " column"}
                onDragStart={(ev) => reordering.start(ev, column.id)}
                onDragEnd={reordering.end}
                onKeyDown={(ev) => reordering.keyDown(ev, column.id)}
            />
            <button
                className={cn("column-sort", active && "is-sorted")}
                aria-label={"Sort by " + label}
                onClick={() => onSort({ field, descending: active ? !sort.descending : false })}
            >
                <span>{label}</span>
                {active ? <SortIcon/> : <ArrowUpDown/>}
            </button>
            <div
                role="separator"
                tabIndex={0}
                aria-orientation="vertical"
                aria-label={"Resize " + label + " column"}
                aria-valuemin={column.columnDef.minSize}
                aria-valuemax={column.columnDef.maxSize}
                aria-valuenow={column.getSize()}
                title="Drag to resize. Double-click to reset."
                className={cn("column-resizer", column.getIsResizing() && "is-resizing")}
                onMouseDown={header.getResizeHandler()}
                onTouchStart={header.getResizeHandler()}
                onDoubleClick={() => column.resetSize()}
                onKeyDown={resizeWithKeys}
                style={{ transform: column.getIsResizing() ? "translateX(" + resizeOffset + "px)" : undefined }}
            />
        </TableHead>
    );
}
