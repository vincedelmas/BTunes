import {rpc} from "@/lib/rpc";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import type {Playlist, Snapshot} from "../../../../shared/types/library";
import {PlaylistForm} from "@/components/library/playlist-form";
import {PlaylistItem} from "@/components/library/playlist-item";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from "@/components/ui/dialog";
import {ListMusic, Settings, Plus} from "lucide-react";
import {navigationItems} from "@/lib/sidebar-navigation";
import type {SidebarLayout} from "@/types/sidebar";


interface SidebarProps {
    view: string;
    layout: SidebarLayout;

    data: Snapshot;
    genres: string[];
    onSettings: () => void;
    onRefresh: () => Promise<void>;
    onError: (error: unknown) => void;
    onNavigate: (view: string) => void;
}


export function Sidebar({ data, view, layout, genres, onNavigate, onSettings, onRefresh, onError }: SidebarProps) {
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<Playlist>();
    const [deleting, setDeleting] = useState<Playlist>();
    const [removing, setRemoving] = useState(false);

    async function deletePlaylist() {
        if (!deleting) return;
        setRemoving(true);

        try {
            await rpc("playlist.delete", { id: deleting.id });
            if (view === "playlist:" + deleting.id) onNavigate("tracks");

            await onRefresh();
            setDeleting(undefined);
        }
        catch (error) {
            onError(error);
        }
        finally {
            setRemoving(false);
        }
    }

    return (
        <aside className="sidebar bg-background rounded-lg flex flex-col pt-5 px-3 pb-3 min-h-0 [&_nav]:shrink-0">
            <div
                className="brand flex items-center gap-[10px] mt-0 mx-[10px] mb-[22px] shrink-0 [&_>_img]:w-[34px] [&_>_img]:h-[34px] [&_>_span]:text-[28px] [&_>_span]:font-[850] [&_>_span]:tracking-[-1.8px]">
                <img
                    src="./icon.svg"
                    alt=""
                />
                <span>BTunes</span>
            </div>

            <nav
                className="flex flex-col gap-1"
                aria-label="Library navigation"
            >
                {layout.navigationIds.map((id) => {
                    const item = navigationItems.find((entry) => entry.id === id)!;
                    return (
                        <Button
                            key={id}
                            className="nav-item w-full justify-start gap-[14px] h-[42px] [&[data-variant=ghost]]:text-muted-foreground [&[data-variant=ghost]:hover]:text-foreground"
                            onClick={() => onNavigate(id)}
                            variant={view === id ? "secondary" : "ghost"}
                            aria-current={view === id ? "page" : undefined}
                        >
                            <item.icon data-icon="inline-start"/>
                            {item.label}
                        </Button>
                    );
                })}
            </nav>

            <div className="playlist-heading flex items-center justify-between pl-3 mt-[18px] mx-0 mb-[6px] shrink-0">
                <p className="eyebrow text-xs font-bold m-0">Playlists</p>
                <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Create playlist"
                    onClick={() => setCreating(!creating)}
                >
                    <Plus/>
                </Button>
            </div>

            <div className="playlists overflow-auto flex-1 min-h-0">
                {layout.playlistIds.map((id) => {
                    const playlist = data.playlists.find((entry) => String(entry.id) === id)!;
                    return (
                        <PlaylistItem
                            key={id}
                            playlist={playlist}
                            active={view === "playlist:" + id}
                            onNavigate={() => onNavigate("playlist:" + id)}
                            onEdit={() => setEditing(playlist)}
                            onDelete={() => setDeleting(playlist)}
                        />
                    );
                })}
            </div>

            {(creating || editing) && (
                <Dialog
                    open
                    onOpenChange={(open) => {
                        if (open) return;
                        setCreating(false);
                        setEditing(undefined);
                    }}
                >
                    <DialogContent className="playlist-dialog gap-0 overflow-hidden p-0 sm:max-w-[560px]">
                        <DialogHeader className="bg-linear-to-br from-primary/10 to-card px-7 py-6">
                            <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <ListMusic className="size-6"/>
                            </div>
                            <DialogTitle className="text-2xl font-bold">{editing ? "Edit playlist" : "Create playlist"}</DialogTitle>
                            <DialogDescription>Give your collection a name. Add songs yourself or let a genre rule fill it for you.</DialogDescription>
                        </DialogHeader>
                        <PlaylistForm
                            key={editing?.id ?? "new"}
                            playlist={editing}
                            genres={genres}
                            onCancel={() => {
                                setCreating(false);
                                setEditing(undefined);
                            }}
                            onError={onError}
                            onSaved={async (id) => {
                                await onRefresh();
                                if (creating) onNavigate("playlist:" + id);
                                setCreating(false);
                                setEditing(undefined);
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {deleting && <Dialog
                open
                onOpenChange={(open) => {
                    if (!open && !removing) setDeleting(undefined);
                }}
            >
                <DialogContent showCloseButton={!removing}>
                    <DialogHeader>
                        <DialogTitle>Delete playlist?</DialogTitle>
                        <DialogDescription>Remove “{deleting.name}”? Your songs and audio files stay in the library.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            disabled={removing}
                            onClick={() => setDeleting(undefined)}
                        >Cancel</Button>
                        <Button
                            variant="destructive"
                            disabled={removing}
                            onClick={() => void deletePlaylist()}
                        >{removing ? "Deleting…" : "Delete playlist"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>}

            <div className="sidebar-bottom mt-auto pt-4 px-2 pb-0 flex flex-col gap-[14px] shrink-0">
                <Button
                    variant={view === "settings" ? "secondary" : "ghost"}
                    aria-current={view === "settings" ? "page" : undefined}
                    className="nav-item w-full justify-start gap-[14px] h-[42px] [&[data-variant=ghost]]:text-muted-foreground [&[data-variant=ghost]:hover]:text-foreground"
                    onClick={onSettings}
                >
                    <Settings/>
                    Settings
                </Button>
            </div>
        </aside>
    );
}
