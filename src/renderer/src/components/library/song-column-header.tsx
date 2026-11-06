import type {Header} from "@tanstack/react-table";
import type {KeyboardEvent} from "react";
import {ChevronDown, ChevronUp, ChevronsUpDown} from "lucide-react";
import type {Track} from "../../../../shared/types/library";
import type {TrackSort, TrackSortField} from "../../../../shared/types/track-sorting";
import type {songTableFeatures} from "@/lib/song-columns";
import type {useDragOrder} from "@/hooks/use-drag-order";
import {TableHead} from "@/components/ui/table";
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
    const DirectionIcon = sort.descending ? ChevronDown : ChevronUp;
    const SortIcon = active ? DirectionIcon : ChevronsUpDown;

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
            className="relative h-9 min-w-0 overflow-hidden border-b px-2 py-0 text-xs font-normal text-muted-foreground aria-[sort=ascending]:text-foreground aria-[sort=descending]:text-foreground data-[dragging=true]:bg-secondary data-[dragging=true]:opacity-60"
            data-column={column.id}
            onDragOver={reordering.over}
            onDrop={(ev) => reordering.drop(ev, column.id)}
            data-dragging={reordering.dragging === column.id || undefined}
            aria-sort={active ? direction : undefined}
        >
            <button
                className={cn("column-sort pl-0 flex items-center gap-2 w-full h-9 text-left bg-transparent border-0 text-[inherit] cursor-grab min-w-0 hover:text-foreground active:cursor-grabbing", active && "is-sorted text-foreground")}
                draggable
                title="Click to sort; drag to reorder. Alt+arrow keys also reorder."
                onDragStart={(ev) => reordering.start(ev, column.id)}
                onDragEnd={reordering.end}
                onKeyDown={(ev) => reordering.keyDown(ev, column.id)}
                aria-label={"Sort by " + label}
                onClick={() => onSort({ field, descending: active ? !sort.descending : false })}
            >
                <span className="truncate">{label}</span>
                <SortIcon className={cn("size-[13px] shrink-0 opacity-35", active && "text-primary opacity-100")}/>
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
                className={cn("column-resizer absolute right-[-4px] top-[9px] bottom-[9px] w-2 cursor-col-resize touch-none z-[2] after:content-[''] after:absolute after:left-[3px] after:w-[2px] after:h-full after:bg-[#ffffff25] after:rounded-[2px] [&:hover::after]:bg-primary [&:focus-visible::after]:bg-primary [&.is-resizing::after]:bg-primary", column.getIsResizing() && "is-resizing")}
                onMouseDown={header.getResizeHandler()}
                onTouchStart={header.getResizeHandler()}
                onDoubleClick={() => column.resetSize()}
                onKeyDown={resizeWithKeys}
                style={{ transform: column.getIsResizing() ? "translateX(" + resizeOffset + "px)" : undefined }}
            />
        </TableHead>
    );
}
