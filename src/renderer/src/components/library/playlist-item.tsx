import {Button} from "@/components/ui/button";
import {Brain, ListMusic, Pencil, Trash2} from "lucide-react";
import type {Playlist} from "../../../../shared/types/library";
import {ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger} from "@/components/ui/context-menu";


interface PlaylistItemProps {
    active: boolean;
    playlist: Playlist;
    onEdit: () => void;
    onDelete: () => void;
    onNavigate: () => void;
}


export function PlaylistItem({ playlist, active, onNavigate, onEdit, onDelete }: PlaylistItemProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger
                render={
                    <Button
                        className="nav-item w-full justify-start gap-3 h-10 aria-[current=page]:bg-selection aria-[current=page]:text-selection-foreground aria-[current=page]:shadow-[inset_2px_0_0_var(--primary)] [&[data-variant=ghost]]:text-muted-foreground [&[data-variant=ghost]:hover]:text-foreground"
                        onClick={onNavigate}
                        variant={active ? "secondary" : "ghost"}
                        aria-current={active ? "page" : undefined}
                    />
                }
            >
                {playlist.rule ? <Brain data-icon="inline-start" className="text-info" aria-label="Smart playlist"/> : <ListMusic data-icon="inline-start"/>}
                <span className="truncate">
                    {playlist.name}
                </span>
            </ContextMenuTrigger>
            <ContextMenuContent className="track-menu">
                <ContextMenuGroup>
                    <ContextMenuItem onClick={onEdit}>
                        <Pencil/>
                        Edit playlist
                    </ContextMenuItem>
                </ContextMenuGroup>
                <ContextMenuSeparator/>
                <ContextMenuGroup>
                    <ContextMenuItem
                        variant="destructive"
                        onClick={onDelete}
                    >
                        <Trash2/>
                        Delete playlist
                    </ContextMenuItem>
                </ContextMenuGroup>
            </ContextMenuContent>
        </ContextMenu>
    );
}
