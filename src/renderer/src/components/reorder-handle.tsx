import {GripVertical} from "lucide-react";
import {Button} from "@/components/ui/button";
import type {DragEventHandler, KeyboardEventHandler} from "react";


interface ReorderHandleProps {
    label: string;
    onDragEnd: DragEventHandler;
    onDragStart: DragEventHandler;
    onKeyDown: KeyboardEventHandler;
}


export function ReorderHandle({ label, onDragStart, onDragEnd, onKeyDown }: ReorderHandleProps) {
    return (
        <Button
            draggable
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={label}
            onDragEnd={onDragEnd}
            onKeyDown={onKeyDown}
            onDragStart={onDragStart}
            title="Drag to reorder, or hold Alt and use the arrow keys"
            className="reorder-handle w-5 text-muted-foreground cursor-grab active:cursor-grabbing hover:text-primary focus-visible:text-primary"
        >
            <GripVertical/>
        </Button>
    );
}
