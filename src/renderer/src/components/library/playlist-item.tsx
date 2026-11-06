import {Button} from "@/components/ui/button";
import {ListMusic, Pencil, Trash2} from "lucide-react";
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
                        className="nav-item w-full justify-start gap-[14px] h-[42px] [&[data-variant=ghost]]:text-muted-foreground [&[data-variant=ghost]:hover]:text-foreground"
                        onClick={onNavigate}
                        variant={active ? "secondary" : "ghost"}
                        aria-current={active ? "page" : undefined}
                    />
                }
            >
                <ListMusic/>
                <span className="truncate">
                    {playlist.name}
                </span>
                {playlist.rule &&
                    <span title="Automatic playlist">✦</span>
                }
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
