import type {ReactElement} from "react";
import {ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuGroup, ContextMenuLabel, ContextMenuTrigger} from "@/components/ui/context-menu";


interface ColumnVisibilityMenuProps {
    children: ReactElement;
    onChange: (id: string, visible: boolean) => void;
    columns: { id: string; label: string; visible: boolean; canHide: boolean }[];
}


export function ColumnVisibilityMenu({ columns, onChange, children }: ColumnVisibilityMenuProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger render={children}/>
            <ContextMenuContent className="track-menu">
                <ContextMenuGroup>
                    <ContextMenuLabel>
                        Visible columns
                    </ContextMenuLabel>
                    {columns.map((column) =>
                        <ContextMenuCheckboxItem
                            key={column.id}
                            closeOnClick={false}
                            checked={column.visible}
                            disabled={!column.canHide}
                            onCheckedChange={(checked) => onChange(column.id, checked)}
                        >
                            {column.label}
                        </ContextMenuCheckboxItem>
                    )}
                </ContextMenuGroup>
            </ContextMenuContent>
        </ContextMenu>
    );
}
