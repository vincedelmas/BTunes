import type {TrackActions} from "@/types/track-actions";
import type {ReactElement} from "react";
import {Clipboard, FolderOpen, ListEnd, ListPlus, Pencil, Play, UserRound, X} from "lucide-react";
import type {Playlist, Track} from "../../../../shared/types/library";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuGroup,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger
} from "@/components/ui/context-menu";
import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "@/lib/music";

interface TrackContextMenuProps {
    tracks: Track[];
    playlists: Playlist[];
    actions: TrackActions;
    children: ReactElement;
}


export function TrackContextMenu({ tracks, playlists, actions, children }: TrackContextMenuProps) {
    const first = tracks[0];
    const classicPlaylists = playlists.filter((playlist) => !playlist.rule);

    return (
        <ContextMenu>
            <ContextMenuTrigger render={children}/>
            <ContextMenuContent className="track-menu">
                <ContextMenuGroup>
                    <ContextMenuLabel>{tracks.length === 1 ? first.title : tracks.length + " songs"}</ContextMenuLabel>
                    <ContextMenuItem onClick={() => actions.onPlay(first, tracks)}>
                        <Play/>
                        Play now
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => actions.onEnqueue(tracks, true)}>
                        <ListPlus/>
                        Play next
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => actions.onEnqueue(tracks)}>
                        <ListEnd/>
                        Add to queue
                    </ContextMenuItem>
                </ContextMenuGroup>
                <ContextMenuSeparator/>
                <ContextMenuGroup>
                    <ContextMenuItem onClick={() => actions.onEdit(tracks)}>
                        <Pencil/>
                        Edit tags
                        {tracks.length > 1 ? " (" + tracks.length + ")" : ""}
                    </ContextMenuItem>
                    {!!classicPlaylists.length && (
                        <ContextMenuSub>
                            <ContextMenuSubTrigger>
                                <ListPlus/>
                                Add to playlist
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent className="track-menu">
                                <ContextMenuGroup>
                                    {classicPlaylists.map((playlist) => (
                                        <ContextMenuItem
                                            key={playlist.id}
                                            onClick={() => actions.onAdd(playlist.id, tracks.map((track) => track.id))}
                                        >
                                            {playlist.name}
                                        </ContextMenuItem>
                                    ))}
                                </ContextMenuGroup>
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                    )}
                    {actions.onRemove && (
                        <ContextMenuItem onClick={() => actions.onRemove?.(tracks.map((track) => track.id))}>
                            <X/>
                            Remove from playlist
                        </ContextMenuItem>
                    )}
                </ContextMenuGroup>
                <ContextMenuSeparator/>
                <ContextMenuGroup>
                    <ContextMenuItem onClick={() => actions.onArtist(first.artist)}>
                        <UserRound/>
                        Go to artist
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => void rpc("track.reveal", { id: first.id }).catch((error) => actions.onError(getErrorMessage(error)))}>
                        <FolderOpen/>
                        Show in folder
                    </ContextMenuItem>
                    <ContextMenuItem
                        onClick={() => void navigator.clipboard.writeText(tracks.map((track) => track.path).join("\n")).catch((error) => actions.onError(getErrorMessage(error)))}>
                        <Clipboard/>
                        Copy file path
                        {tracks.length > 1 ? "s" : ""}
                    </ContextMenuItem>
                </ContextMenuGroup>
            </ContextMenuContent>
        </ContextMenu>
    );
}
