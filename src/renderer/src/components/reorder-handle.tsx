import {GripVertical} from "lucide-react";
import type {DragEventHandler, KeyboardEventHandler} from "react";
import {Button} from "@/components/ui/button";

interface ReorderHandleProps {
    label: string;
    onDragStart: DragEventHandler;
    onDragEnd: DragEventHandler;
    onKeyDown: KeyboardEventHandler;
}

export function ReorderHandle({ label, onDragStart, onDragEnd, onKeyDown }: ReorderHandleProps) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="reorder-handle"
            draggable
            aria-label={label}
            title="Drag to reorder, or hold Alt and use the arrow keys"
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onKeyDown={onKeyDown}
        >
            <GripVertical/>
        </Button>
    );
}
