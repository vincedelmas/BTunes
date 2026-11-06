import {rpc} from "@/lib/rpc";
import {useState} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {FilterSelect} from "@/components/filter-select";
import type {Snapshot} from "../../../../shared/contracts";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Copy, Disc3, FolderPlus, Heart, History, Library, ListMusic, Music2, Plus, Smartphone,} from "lucide-react";


const navigation = [
    { id: "albums", label: "Albums", icon: Disc3 },
    { id: "tracks", label: "Songs", icon: Music2 },
    { id: "artists", label: "Artists", icon: Library },
    { id: "favorites", label: "Liked songs", icon: Heart },
    { id: "history", label: "Recently played", icon: History },
    { id: "duplicates", label: "Possible duplicates", icon: Copy },
    { id: "android", label: "Your devices", icon: Smartphone },
];


interface SidebarProps {
    view: string;
    busy: boolean;
    data: Snapshot;
    genres: string[];
    onImport: () => void;
    onRefresh: () => Promise<void>;
    onError: (error: unknown) => void;
    onNavigate: (view: string) => void;
}


export function Sidebar({ data, view, genres, busy, onNavigate, onImport, onRefresh, onError }: SidebarProps) {
    const [name, setName] = useState("");
    const [rule, setRule] = useState("");
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);

    async function createPlaylist() {
        setSaving(true);

        try {
            const id = await rpc("playlist.create", { name, rule: rule || undefined });
            await onRefresh();

            setName("");
            setRule("");
            setCreating(false);
            onNavigate("playlist:" + id);
        }
        catch (error) {
            onError(error);
        }
        finally {
            setSaving(false);
        }
    }

    return (
        <aside className="sidebar">
            <div className="brand">
                <Disc3/>
                <span>BTunes</span>
            </div>
            <div className="library-label">
                <Library size={20}/>
                <span>Your Library</span>
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
                        {item.id === "favorites" &&
                            <span className="nav-count">
                                {data.tracks.filter((track) => track.favorite).length}
                            </span>
                        }
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

            {creating &&
                <FieldGroup className="playlist-form">
                    <Field>
                        <FieldLabel htmlFor="playlist-name">
                            Playlist name
                        </FieldLabel>
                        <Input
                            id="playlist-name"
                            placeholder="My playlist"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            disabled={saving}
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="playlist-rule">
                            Automatic rule
                        </FieldLabel>
                        <FilterSelect
                            value={rule}
                            disabled={saving}
                            id="playlist-rule"
                            onChange={setRule}
                            label="Automatic genre rule"
                            placeholder="Classic playlist"
                            options={genres.map((genre) => ({ value: genre, label: genre }))}
                        />
                    </Field>
                    <Button size="sm" disabled={saving || !name.trim()} onClick={() => void createPlaylist()}>
                        {saving ? "Creating…" : "Create playlist"}
                    </Button>
                </FieldGroup>
            }

            <div className="playlists">
                {data.playlists.map((playlist) =>
                    <Button
                        key={playlist.id}
                        className="nav-item"
                        onClick={() => onNavigate("playlist:" + playlist.id)}
                        variant={view === "playlist:" + playlist.id ? "secondary" : "ghost"}
                    >
                        <ListMusic/>
                        <span className="truncate">
                            {playlist.name}
                        </span>
                        {playlist.rule &&
                            <span title="Automatic playlist">✦</span>
                        }
                    </Button>
                )}
            </div>

            <div className="sidebar-bottom">
                <div className="local-status">
                    <span/> Your music, on your terms.
                </div>
                <small>{data.folders.length} watched folder(s)</small>
                <Button variant="outline" disabled={busy} onClick={onImport}>
                    <FolderPlus/>
                    {busy ? "Indexing…" : "Add music folder"}
                </Button>
            </div>
        </aside>
    );
}
