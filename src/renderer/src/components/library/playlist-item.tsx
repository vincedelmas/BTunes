import {Button} from "@/components/ui/button";
import {Brain, ListMusic, Pencil, Pin, PinOff, Trash2} from "lucide-react";
import {ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger} from "@/components/ui/context-menu";


interface PlaylistItemProps {
    name: string;
    active: boolean;
    smart: boolean;
    pinned: boolean;
    canPin: boolean;
    onPin: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onNavigate: () => void;
}


export function PlaylistItem({ name, active, smart, pinned, canPin, onPin, onNavigate, onEdit, onDelete }: PlaylistItemProps) {
    const pinLabel = pinned ? "Unpin " + name : "Pin " + name;

    return (
        <ContextMenu>
            <ContextMenuTrigger render={<div className="playlist-item group flex min-w-0 items-center gap-1"/>}>
                <Button
                    size="navigation"
                    className="nav-item min-w-0 flex-1 justify-start aria-[current=page]:bg-selection aria-[current=page]:text-selection-foreground aria-[current=page]:shadow-[inset_2px_0_0_var(--primary)] [&[data-variant=ghost]]:text-muted-foreground [&[data-variant=ghost]:hover]:text-foreground"
                    onClick={onNavigate}
                    variant={active ? "secondary" : "ghost"}
                    aria-current={active ? "page" : undefined}
                >
                    {smart ? <Brain data-icon="inline-start" className="text-info" aria-label="Smart playlist"/> : <ListMusic data-icon="inline-start"/>}
                    <span className="truncate">{name}</span>
                </Button>
                <Button
                    variant="plain"
                    size="icon-xs"
                    className="pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
                    aria-label={pinLabel}
                    aria-pressed={pinned}
                    title={!pinned && !canPin ? "Unpin a playlist first (3 of 3 pinned)" : pinLabel}
                    disabled={!pinned && !canPin}
                    onClick={onPin}
                >
                    {pinned ? <PinOff/> : <Pin/>}
                </Button>
            </ContextMenuTrigger>
            <ContextMenuContent className="track-menu">
                <ContextMenuGroup>
                    <ContextMenuItem onClick={onPin} disabled={!pinned && !canPin}>
                        {pinned ? <PinOff/> : <Pin/>}
                        {pinned ? "Unpin playlist" : "Pin to sidebar"}
                    </ContextMenuItem>
                    {onEdit && <ContextMenuItem onClick={onEdit}>
                        <Pencil/>
                        Edit playlist
                    </ContextMenuItem>}
                </ContextMenuGroup>
                {onDelete && <>
                    <ContextMenuSeparator/>
                    <ContextMenuGroup>
                        <ContextMenuItem variant="destructive" onClick={onDelete}>
                            <Trash2/>
                            Delete playlist
                        </ContextMenuItem>
                    </ContextMenuGroup>
                </>}
            </ContextMenuContent>
        </ContextMenu>
    );
}
