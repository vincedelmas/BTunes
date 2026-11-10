import {ChevronDown, ChevronUp} from "lucide-react";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import {TrackContextMenu} from "@/components/library/track-context-menu";
import type {TrackActions} from "@/types/track-actions";
import type {Playlist, Track} from "../../../../shared/types/library";


interface SidebarNowPlayingProps {
    current?: Track;
    playlists: Playlist[];
    actions: TrackActions;
    expanded: boolean;
    onToggle: () => void;
    onReveal: () => void;
}


export function SidebarNowPlaying({ current, playlists, actions, expanded, onToggle, onReveal }: SidebarNowPlayingProps) {
    const details = (
        <div
            id="sidebar-playing-details"
            className="flex flex-col gap-2 pb-1 pt-2 outline-none focus-visible:outline-none"
        >
            <button
                type="button"
                onClick={onReveal}
                disabled={!current}
                aria-label="Locate current song in library"
                className="mx-auto block rounded-lg outline-none focus-visible:outline-none [&_.cover]:size-[clamp(40px,calc(100vh-700px),192px)] [&_.cover]:max-w-full [&_.cover]:rounded-lg"
            >
                <Cover track={current}/>
            </button>
            <div className="min-w-0 px-1">
                <p className="truncate text-sm font-semibold" title={current?.title}>
                    {current?.title ?? "Nothing playing"}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground" title={current?.artist}>
                    {current?.artist ?? "Choose a song to get started"}
                </p>
            </div>
        </div>
    );

    const content = (
        <section className="sidebar-now-playing mt-3 shrink-0 border-t border-border/60 pt-2 outline-none focus-visible:outline-none" aria-label="Now playing artwork">
            <div className="flex h-7 items-center justify-between px-1">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Now playing</p>
                <Button
                    variant="plain"
                    size="icon-xs"
                    aria-expanded={expanded}
                    aria-controls="sidebar-playing-details"
                    aria-label={expanded ? "Hide now-playing artwork" : "Show now-playing artwork"}
                    onClick={onToggle}
                >
                    {expanded ? <ChevronDown/> : <ChevronUp/>}
                </Button>
            </div>
            {expanded && details}
        </section>
    );

    if (!current) return content;

    return <TrackContextMenu tracks={[current]} playlists={playlists} actions={actions}>
        {content}
    </TrackContextMenu>;
}
