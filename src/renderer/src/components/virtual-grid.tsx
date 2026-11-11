import type {ReactNode} from "react";
import type {ItemReveal} from "@/types/reveal";
import type {GridSelection} from "@/types/selection";
import {useVirtualizer} from "@tanstack/react-virtual";
import {useCallback, useEffect, useRef, useState} from "react";
import {useMarqueeSelection} from "@/hooks/use-marquee-selection";


interface VirtualGridProps<T> {
    items: T[];
    label: string;
    itemHeight?: number;
    maxColumns?: number;
    reveal?: ItemReveal;
    minColumnWidth?: number;
    onRevealed?: () => void;
    selection?: GridSelection;
    renderItem: (item: T) => ReactNode;
    getKey: (item: T) => string | number;
}


export function VirtualGrid<T>({ items, getKey, renderItem, minColumnWidth = 180, itemHeight, maxColumns = Infinity, label, selection, reveal, onRevealed }: VirtualGridProps<T>) {
    "use no memo"; // TanStack Virtual measurements must be read on every virtualizer update.

    const container = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const columns = Math.min(maxColumns, Math.max(1, Math.floor(width / minColumnWidth)));
    const rowHeight = itemHeight ?? Math.ceil(width / columns + 104);
    const marquee = useMarqueeSelection(container, items.map((item) => String(getKey(item))), { columns, rowHeight, width }, selection);
    const rowKey = useCallback((index: number) => getKey(items[index * columns]), [items, columns, getKey]);

    useEffect(() => {
        const element = container.current;
        if (!element) return;

        const observer = new ResizeObserver(() => setWidth(element.clientWidth));
        observer.observe(element);
        setWidth(element.clientWidth);

        return () => observer.disconnect();
    }, []);

    // Oxlint checks this API even though the component explicitly opts out above.
    // oxlint-disable-next-line react/incompatible-library
    const virtualizer = useVirtualizer({
        count: Math.ceil(items.length / columns),
        getScrollElement: () => container.current,
        estimateSize: () => rowHeight,
        getItemKey: rowKey,
        overscan: 2,
    });

    useEffect(() => virtualizer.measure(), [rowHeight, columns, virtualizer]);

    const revealIndex = reveal ? items.findIndex((item) => getKey(item) === reveal.key) : -1;

    useEffect(() => {
        if (revealIndex < 0 || !width) return;
        virtualizer.scrollToIndex(Math.floor(revealIndex / columns), { align: "center" });
        onRevealed?.();
    }, [reveal?.request, revealIndex, columns, width, virtualizer, onRevealed]);

    return (
        <div
            tabIndex={0}
            ref={container}
            aria-label={label}
            onPointerUp={marquee.onPointerUp}
            role={selection ? "grid" : undefined}
            onPointerDown={marquee.onPointerDown}
            onPointerMove={marquee.onPointerMove}
            onPointerCancel={marquee.onPointerCancel}
            aria-multiselectable={selection ? true : undefined}
            className="virtual-grid-scroll relative h-full min-h-0 overflow-auto overscroll-contain outline-none focus-visible:outline-1 focus-visible:outline-primary focus-visible:-outline-offset-1 [scrollbar-gutter:stable]"
            onKeyDown={(ev) => {
                if (!selection || (ev.target as HTMLElement).closest("button,input")) return;
                if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "a") {
                    ev.preventDefault();
                    selection.onChange(items.map((item) => String(getKey(item))));
                }
                if (ev.key === "Escape") selection.onChange([]);
            }}
        >
            <div
                className="relative w-full"
                style={{ height: virtualizer.getTotalSize() }}
            >
                {virtualizer.getVirtualItems().map((row) => (
                    <div
                        key={row.key}
                        role={selection ? "row" : undefined}
                        className="virtual-grid-row absolute top-0 left-0 grid w-full items-start gap-x-2"
                        style={{
                            gridTemplateColumns: "repeat(" + columns + ", minmax(0, 1fr))",
                            height: rowHeight,
                            transform: "translateY(" + row.start + "px)",
                        }}
                    >
                        {items.slice(row.index * columns, (row.index + 1) * columns).map((item) => (
                            <div
                                key={getKey(item)}
                                className="virtual-grid-cell min-w-0 overflow-hidden"
                            >
                                {renderItem(item)}
                            </div>
                        ))}
                    </div>
                ))}
                {marquee.rectangle && (
                    <div
                        aria-hidden="true"
                        style={marquee.rectangle}
                        data-slot="selection-marquee"
                        className="pointer-events-none absolute border border-primary bg-primary/10"
                    />
                )}
            </div>
        </div>
    );
}
