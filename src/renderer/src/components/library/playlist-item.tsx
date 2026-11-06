import {ListMusic, Pencil, Trash2} from "lucide-react";
import type {Playlist} from "../../../../shared/types/library";
import {Button} from "@/components/ui/button";
import {ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator} from "@/components/ui/context-menu";

interface PlaylistItemProps {
    playlist: Playlist;
    active: boolean;
    onNavigate: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function PlaylistItem({ playlist, active, onNavigate, onEdit, onDelete }: PlaylistItemProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger render={<Button className="nav-item" onClick={onNavigate} variant={active ? "secondary" : "ghost"} aria-current={active ? "page" : undefined}/>}>
                <ListMusic/>
                <span className="truncate">{playlist.name}</span>
                {playlist.rule && <span title="Automatic playlist">✦</span>}
            </ContextMenuTrigger>
            <ContextMenuContent className="track-menu">
                <ContextMenuGroup>
                    <ContextMenuItem onClick={onEdit}><Pencil/>Edit playlist</ContextMenuItem>
                </ContextMenuGroup>
                <ContextMenuSeparator/>
                <ContextMenuGroup>
                    <ContextMenuItem variant="destructive" onClick={onDelete}><Trash2/>Delete playlist</ContextMenuItem>
                </ContextMenuGroup>
            </ContextMenuContent>
        </ContextMenu>
    );
}
