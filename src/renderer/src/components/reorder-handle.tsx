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
            className="reorder-handle w-5 text-[#777] cursor-grab opacity-[0.55] active:cursor-grabbing hover:opacity-[1] hover:text-primary focus-visible:opacity-[1] focus-visible:text-primary"
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
