import {rpc} from "@/lib/rpc";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import type {Playlist, Snapshot} from "../../../../shared/types/library";
import {PlaylistForm} from "@/components/library/playlist-form";
import {PlaylistItem} from "@/components/library/playlist-item";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from "@/components/ui/dialog";
import {Settings, Plus} from "lucide-react";
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

        await rpc("playlist.delete", { id: deleting.id })
            .then(async () => {
                if (view === "playlist:" + deleting.id) onNavigate("tracks");
                await onRefresh();
                setDeleting(undefined);
            })
            .catch(onError)
            .finally(() => setRemoving(false));
    }

    return (
        <aside className="sidebar">
            <div className="brand">
                <img
                    src="./icon.svg"
                    alt=""
                />
                <span>BTunes</span>
            </div>

            <nav aria-label="Library navigation">
                {layout.navigationIds.map((id) => {
                    const item = navigationItems.find((entry) => entry.id === id)!;
                    return (
                        <Button
                            key={id}
                            className="nav-item"
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

            <div className="playlist-heading">
                <p className="eyebrow">Playlists</p>
                <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Create playlist"
                    onClick={() => setCreating(!creating)}
                >
                    <Plus/>
                </Button>
            </div>

            <div className="playlists">
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
                <Dialog open onOpenChange={(open) => {
                    if (open) return;
                    setCreating(false);
                    setEditing(undefined);
                }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editing ? "Edit playlist" : "Create playlist"}</DialogTitle>
                            <DialogDescription>Choose a name and an optional automatic genre rule.</DialogDescription>
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

            <div className="sidebar-bottom">
                <Button
                    variant={view === "settings" ? "secondary" : "ghost"}
                    aria-current={view === "settings" ? "page" : undefined}
                    className="nav-item"
                    onClick={onSettings}
                >
                    <Settings/>
                    Settings
                </Button>
            </div>
        </aside>
    );
}
