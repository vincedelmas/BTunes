import {useCallback, useEffect, useRef, useState} from "react";
import type {ReactNode} from "react";
import {useVirtualizer} from "@tanstack/react-virtual";

export function VirtualGrid<T>({ items, getKey, renderItem, minColumnWidth = 180, itemHeight, maxColumns = Infinity, label }: {
    items: T[];
    getKey: (item: T) => string | number;
    renderItem: (item: T) => ReactNode;
    minColumnWidth?: number;
    itemHeight?: number;
    maxColumns?: number;
    label: string;
}) {
    const container = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const columns = Math.min(maxColumns, Math.max(1, Math.floor(width / minColumnWidth)));
    const rowHeight = itemHeight ?? Math.ceil(width / columns + 104);
    const rowKey = useCallback((index: number) => getKey(items[index * columns]), [items, columns, getKey]);

    useEffect(() => {
        const element = container.current;
        if (!element) return;

        const observer = new ResizeObserver(() => setWidth(element.clientWidth));
        observer.observe(element);
        setWidth(element.clientWidth);

        return () => observer.disconnect();
    }, []);

    // TanStack Virtual maintains mutable measurements. Keep this hook outside compiler memoization.
    // oxlint-disable-next-line react/incompatible-library
    const virtualizer = useVirtualizer({
        count: Math.ceil(items.length / columns),
        getScrollElement: () => container.current,
        estimateSize: () => rowHeight,
        getItemKey: rowKey,
        overscan: 2,
    });

    useEffect(() => virtualizer.measure(), [rowHeight, columns, virtualizer]);

    return (
        <div ref={container} className="virtual-grid-scroll" aria-label={label} tabIndex={0}>
            <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
                {virtualizer.getVirtualItems().map((row) => (
                    <div key={row.key} className="virtual-grid-row" style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns: "repeat(" + columns + ", minmax(0, 1fr))",
                        height: rowHeight,
                        transform: "translateY(" + row.start + "px)",
                    }}>
                        {items.slice(row.index * columns, (row.index + 1) * columns).map((item) => (
                            <div key={getKey(item)} className="virtual-grid-cell">{renderItem(item)}</div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
