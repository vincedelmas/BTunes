import type {ReactElement} from "react";
import {
    ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuGroup,
    ContextMenuLabel, ContextMenuCheckboxItem,
} from "@/components/ui/context-menu";

interface ColumnVisibilityMenuProps {
    columns: { id: string; label: string; visible: boolean; canHide: boolean }[];
    onChange: (id: string, visible: boolean) => void;
    children: ReactElement;
}

export function ColumnVisibilityMenu({ columns, onChange, children }: ColumnVisibilityMenuProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger render={children}/>
            <ContextMenuContent className="track-menu">
                <ContextMenuGroup>
                    <ContextMenuLabel>Visible columns</ContextMenuLabel>
                    {columns.map((column) => (
                        <ContextMenuCheckboxItem key={column.id} checked={column.visible} disabled={!column.canHide}
                                                 closeOnClick={false} onCheckedChange={(checked) => onChange(column.id, checked)}>
                            {column.label}
                        </ContextMenuCheckboxItem>
                    ))}
                </ContextMenuGroup>
            </ContextMenuContent>
        </ContextMenu>
    );
}
