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
        <aside className="sidebar bg-background/40 rounded-xl flex flex-col pt-6 px-3 pb-3 min-h-0">
            <div
                className="brand flex items-center gap-3 mt-0 mx-3 mb-6 shrink-0">
                <img
                    className="size-8 grayscale"
                    src="./icon.svg"
                    alt=""
                />
                <span className="text-xl font-semibold tracking-[-0.04em]">BTunes</span>
            </div>

            <nav
                className="flex shrink-0 flex-col gap-1"
                aria-label="Library navigation"
            >
                {layout.navigationIds.map((id) => {
                    const item = navigationItems.find((entry) => entry.id === id)!;
                    return (
                        <Button
                            key={id}
                            className="nav-item w-full justify-start gap-3 h-10 [&[data-variant=ghost]]:text-muted-foreground [&[data-variant=ghost]:hover]:text-foreground aria-[current=page]:bg-secondary aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_2px_0_0_var(--primary)]"
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

            <div className="playlist-heading flex items-center justify-between border-t border-border/60 pl-3 pt-4 mt-5 mx-0 mb-2 shrink-0">
                <p className="eyebrow text-xs uppercase tracking-[0.12em] font-semibold text-muted-foreground m-0">Playlists</p>
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
                            <DialogDescription>Set a name and choose whether to add songs manually or by genre.</DialogDescription>
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

            <div className="sidebar-bottom mt-auto border-t border-border/60 pt-3 flex flex-col gap-3 shrink-0">
                <Button
                    variant={view === "settings" ? "secondary" : "ghost"}
                    aria-current={view === "settings" ? "page" : undefined}
                    className="nav-item w-full justify-start gap-3 h-10 [&[data-variant=ghost]]:text-muted-foreground [&[data-variant=ghost]:hover]:text-foreground aria-[current=page]:bg-secondary aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_2px_0_0_var(--primary)]"
                    onClick={onSettings}
                >
                    <Settings data-icon="inline-start"/>
                    Settings
                </Button>
            </div>
        </aside>
    );
}
