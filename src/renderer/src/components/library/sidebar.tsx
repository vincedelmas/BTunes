import {rpc} from "@/lib/rpc";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import type {Playlist, Snapshot} from "../../../../shared/types/library";
import {PlaylistForm} from "@/components/library/playlist-form";
import {PlaylistItem} from "@/components/library/playlist-item";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from "@/components/ui/dialog";
import {Copy, Disc3, Settings, History, Library, Music2, Plus, Smartphone} from "lucide-react";


const navigation = [
    { id: "tracks", label: "Songs", icon: Music2 },
    { id: "albums", label: "Albums", icon: Disc3 },
    { id: "artists", label: "Artists", icon: Library },
    { id: "history", label: "Recently played", icon: History },
    { id: "duplicates", label: "Possible duplicates", icon: Copy },
    { id: "android", label: "Devices", icon: Smartphone },
];


interface SidebarProps {
    view: string;

    data: Snapshot;
    genres: string[];
    onSettings: () => void;
    onRefresh: () => Promise<void>;
    onError: (error: unknown) => void;
    onNavigate: (view: string) => void;
}


export function Sidebar({ data, view, genres, onNavigate, onSettings, onRefresh, onError }: SidebarProps) {
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
                <Disc3/>
                <span>BTunes</span>
            </div>

            <nav aria-label="Library navigation">
                {navigation.map((item) =>
                    <Button
                        key={item.id}
                        className="nav-item"
                        onClick={() => onNavigate(item.id)}
                        variant={view === item.id ? "secondary" : "ghost"}
                        aria-current={view === item.id ? "page" : undefined}
                    >
                        <item.icon data-icon="inline-start"/>
                        {item.label}

                    </Button>
                )}
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

            {creating && <PlaylistForm genres={genres} onCancel={() => setCreating(false)} onError={onError}
                                       onSaved={async (id) => {
                                           await onRefresh();
                                           setCreating(false);
                                           onNavigate("playlist:" + id);
                                       }}/>}

            <div className="playlists">
                {data.playlists.map((playlist) => (
                    <PlaylistItem key={playlist.id} playlist={playlist} active={view === "playlist:" + playlist.id}
                                  onNavigate={() => onNavigate("playlist:" + playlist.id)} onEdit={() => {
                        setCreating(false);
                        setEditing(playlist);
                    }}
                                  onDelete={() => setDeleting(playlist)}/>
                ))}
            </div>

            {editing && <Dialog open onOpenChange={(open) => {
                if (!open) setEditing(undefined);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit playlist</DialogTitle>
                        <DialogDescription>Change its name or automatic genre rule.</DialogDescription>
                    </DialogHeader>
                    <PlaylistForm playlist={editing} genres={genres} onCancel={() => setEditing(undefined)} onError={onError}
                                  onSaved={async () => {
                                      await onRefresh();
                                      setEditing(undefined);
                                  }}/>
                </DialogContent>
            </Dialog>}

            {deleting && <Dialog open onOpenChange={(open) => {
                if (!open && !removing) setDeleting(undefined);
            }}>
                <DialogContent showCloseButton={!removing}>
                    <DialogHeader>
                        <DialogTitle>Delete playlist?</DialogTitle>
                        <DialogDescription>Remove “{deleting.name}”? Your songs and audio files stay in the library.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" disabled={removing} onClick={() => setDeleting(undefined)}>Cancel</Button>
                        <Button variant="destructive" disabled={removing} onClick={() => void deletePlaylist()}>{removing ? "Deleting…" : "Delete playlist"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>}

            <div className="sidebar-bottom">
                <Button variant={view === "settings" ? "secondary" : "ghost"} aria-current={view === "settings" ? "page" : undefined} className="nav-item" onClick={onSettings}>
                    <Settings/>Settings</Button>
            </div>
        </aside>
    );
}
