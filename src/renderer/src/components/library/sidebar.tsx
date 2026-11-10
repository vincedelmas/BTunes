import {useState} from "react";
import {Settings} from "lucide-react";
import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {PlaylistBrowser} from "@/components/library/playlist-browser";
import {SidebarNowPlaying} from "@/components/player/sidebar-now-playing";
import {navigationGroups, navigationItems} from "@/lib/sidebar-navigation";
import type {Snapshot, Track} from "../../../../shared/types/library";
import type {TrackActions} from "@/types/track-actions";
import {LibrarySearch} from "@/components/library/library-search";
import type {SidebarLayout} from "@/types/sidebar";


interface SidebarProps {
    view: string;
    layout: SidebarLayout;
    data: Snapshot;
    genres: string[];
    current?: Track;
    search: string;
    onSearch: (value: string) => void;
    onClearSearch: () => void;
    actions: TrackActions;
    artworkExpanded: boolean;
    onArtworkToggle: () => void;
    onReveal: () => void;
    onSettings: () => void;
    onRefresh: () => Promise<void>;
    onError: (error: unknown) => void;
    onNavigate: (view: string) => void;
}


export function Sidebar({ data, view, layout, genres, current, artworkExpanded, onArtworkToggle, onReveal, onNavigate, onSettings, onRefresh, onError, search, onSearch, onClearSearch, actions }: SidebarProps) {
    const [playlistsOpen, setPlaylistsOpen] = useState(false);

    return (
        <aside className="sidebar flex min-h-0 flex-col rounded-xl bg-canvas px-3 pb-2 pt-4">
            <div className="brand mx-2 mb-4 flex shrink-0 items-center gap-2.5">
                <img className="size-8" src="./icon.svg" alt=""/>
                <span className="text-xl font-semibold tracking-tight">BTunes</span>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto"
                    aria-label="Settings"
                    title="Settings"
                    aria-current={view === "settings" ? "page" : undefined}
                    onClick={onSettings}
                >
                    <Settings className={cn(view === "settings" && "text-primary")}/>
                    <span className="sr-only">Settings</span>
                </Button>
            </div>
            <div className="mb-3 shrink-0">
                <LibrarySearch
                    value={search}
                    onChange={onSearch}
                    onClear={onClearSearch}
                    placeholder={view === "settings" ? "Search disabled" : "Search this page"}
                    disabled={view === "settings"}
                />
            </div>
            {playlistsOpen ? <PlaylistBrowser
                view={view}
                playlists={data.playlists}
                layout={layout}
                genres={genres}
                onBack={() => setPlaylistsOpen(false)}
                onNavigate={onNavigate}
                onRefresh={onRefresh}
                onError={onError}
            /> : <div className="min-h-0 flex-1 overflow-y-auto">
                <nav
                    className="flex shrink-0 flex-col gap-1"
                    aria-label="Library navigation"
                >
                    {navigationGroups.map((group) => (
                        <div key={group.id} className={cn("flex flex-col gap-1", group.id !== "library" && "mt-3")}>
                            {group.id !== "library" && <p className="mb-1 px-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{group.label}</p>}
                            {layout.navigationIds.map((id) => navigationItems.find((item) => item.id === id)!)
                                .filter((item) => item.group === group.id)
                                .map((item) => {
                                    const active = item.id === "playlists" ? view.startsWith("playlist:") : view === item.id;

                                    return (
                                        <Button
                                            key={item.id}
                                            className="nav-item h-9 w-full justify-start gap-3 [&[data-variant=ghost]]:text-muted-foreground [&[data-variant=ghost]:hover]:text-foreground aria-[current=page]:bg-selection aria-[current=page]:text-selection-foreground aria-[current=page]:shadow-[inset_2px_0_0_var(--primary)]"
                                            onClick={() => item.id === "playlists" ? setPlaylistsOpen(true) : onNavigate(item.id)}
                                            variant={active ? "secondary" : "ghost"}
                                            aria-current={active ? "page" : undefined}
                                            aria-label={item.id === "playlists" ? "Open playlists" : undefined}
                                        >
                                            <item.icon data-icon="inline-start" className={item.tone}/>
                                            {item.label}
                                            {item.id === "playlists" && <span className="ml-auto text-xs text-muted-foreground">{data.playlists.length}</span>}
                                        </Button>
                                    );
                                })}
                        </div>
                    ))}
                </nav>
            </div>}
            <SidebarNowPlaying
                current={current}
                actions={actions}
                playlists={data.playlists}
                expanded={artworkExpanded}
                onToggle={onArtworkToggle}
                onReveal={onReveal}
            />
        </aside>
    );
}
