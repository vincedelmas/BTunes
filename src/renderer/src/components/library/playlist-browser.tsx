import {smartMixes} from "../../../../shared/smart-mixes";
import {useState} from "react";
import {ArrowLeft, Brain, ListMusic, Plus} from "lucide-react";
import {rpc} from "@/lib/rpc";
import {Button} from "@/components/ui/button";
import {PlaylistForm} from "@/components/library/playlist-form";
import {PlaylistItem} from "@/components/library/playlist-item";
import type {Playlist} from "../../../../shared/types/library";
import type {SidebarLayout} from "@/types/sidebar";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from "@/components/ui/dialog";


interface PlaylistBrowserProps {
    view: string;
    playlists: Playlist[];
    layout: SidebarLayout;
    genres: string[];
    onBack: () => void;
    onNavigate: (view: string) => void;
    onRefresh: () => Promise<void>;
    onError: (error: unknown) => void;
}


export function PlaylistBrowser({ view, playlists, layout, genres, onBack, onNavigate, onRefresh, onError }: PlaylistBrowserProps) {
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<Playlist>();
    const [deleting, setDeleting] = useState<Playlist>();
    const [removing, setRemoving] = useState(false);

    async function deletePlaylist() {
        if (!deleting) return;
        setRemoving(true);

        try {
            if (view === "playlist:" + deleting.id) onNavigate("tracks");
            await rpc("playlist.delete", { id: deleting.id });
            layout.setPinned("playlist:" + deleting.id, false);

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
        <section id="playlist-browser" className="playlist-browser flex min-h-0 flex-1 flex-col" aria-label="Playlist browser">
            <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={onBack}>
                    <ArrowLeft data-icon="inline-start"/>
                    Library
                </Button>
                <Button size="icon" variant="ghost" aria-label="Create playlist" onClick={() => setCreating(true)}>
                    <Plus/>
                </Button>
            </div>
            <h2 className="mb-3 px-2 text-lg font-semibold">Playlists</h2>
            <div className="playlists min-h-0 flex-1 overflow-y-auto">
                <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Smart mixes</p>
                {smartMixes.map((mix) => <PlaylistItem
                    key={mix.id}
                    name={mix.name}
                    smart
                    active={view === mix.id}
                    pinned={layout.pinnedIds.includes(mix.id)}
                    canPin={layout.pinnedIds.length < 3}
                    onPin={() => layout.setPinned(mix.id, !layout.pinnedIds.includes(mix.id))}
                    onNavigate={() => onNavigate(mix.id)}
                />)}
                <p className="mb-2 mt-5 px-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Your playlists</p>
                {!playlists.length && <p className="px-2 text-xs text-muted-foreground">Create a playlist or choose a genre rule.</p>}
                {layout.playlistIds.map((id) => {
                    const playlist = playlists.find((entry) => String(entry.id) === id)!;
                    return (
                        <PlaylistItem
                            key={id}
                            name={playlist.name}
                            smart={Boolean(playlist.rule)}
                            pinned={layout.pinnedIds.includes("playlist:" + id)}
                            canPin={layout.pinnedIds.length < 3}
                            onPin={() => layout.setPinned("playlist:" + id, !layout.pinnedIds.includes("playlist:" + id))}
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
                                {editing?.rule ? <Brain className="size-6"/> : <ListMusic className="size-6"/>}
                            </div>
                            <DialogTitle className="text-2xl font-bold">{editing ? "Edit playlist" : "Create playlist"}</DialogTitle>
                            <DialogDescription>Set a name and choose whether to add songs manually or by genre.</DialogDescription>
                        </DialogHeader>
                        <PlaylistForm
                            key={editing?.id ?? "new"}
                            playlist={editing}
                            pinned={Boolean(editing && layout.pinnedIds.includes("playlist:" + editing.id))}
                            canPin={layout.pinnedIds.length < 3}
                            genres={genres}
                            onCancel={() => {
                                setCreating(false);
                                setEditing(undefined);
                            }}
                            onError={onError}
                            onSaved={async (id, pinned) => {
                                await onRefresh();
                                layout.setPinned("playlist:" + id, pinned);
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
        </section>
    );
}
