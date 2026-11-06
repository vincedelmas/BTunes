import {useState} from "react";
import type {Playlist} from "../../../../shared/types/library";
import {rpc} from "@/lib/rpc";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {FilterSelect} from "@/components/filter-select";

interface PlaylistFormProps {
    playlist?: Playlist;
    genres: string[];
    onSaved: (id: number) => Promise<void>;
    onCancel: () => void;
    onError: (error: unknown) => void;
}

export function PlaylistForm({ playlist, genres, onSaved, onCancel, onError }: PlaylistFormProps) {
    const [name, setName] = useState(playlist?.name ?? "");
    const [rule, setRule] = useState(playlist?.rule ?? "");
    const [saving, setSaving] = useState(false);
    const rules = [...new Set([...genres, ...(playlist?.rule ? [playlist.rule] : [])])];

    const saveLabel = playlist ? "Save playlist" : "Create playlist";

    async function save() {
        setSaving(true);

        await Promise.resolve().then(async () => {
            const details = { name, rule: rule || undefined };
            if (playlist) {
                await rpc("playlist.update", { id: playlist.id, ...details });
                return playlist.id;
            }
            return rpc("playlist.create", details);
        }).then(onSaved).catch(onError).finally(() => setSaving(false));
    }

    return (
        <form className="playlist-form" onSubmit={(ev) => {
            ev.preventDefault();
            void save();
        }}>
            <FieldGroup>
                <Field>
                    <FieldLabel htmlFor="playlist-name">Playlist name</FieldLabel>
                    <Input id="playlist-name" value={name} placeholder="My playlist" maxLength={100} disabled={saving}
                           onChange={(ev) => setName(ev.target.value)}/>
                </Field>
                <Field>
                    <FieldLabel htmlFor="playlist-rule">Automatic rule</FieldLabel>
                    <FilterSelect id="playlist-rule" label="Automatic genre rule" placeholder="Classic playlist"
                                  value={rule} onChange={setRule} disabled={saving} options={rules.map((genre) => ({ value: genre, label: genre }))}/>
                </Field>
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>Cancel</Button>
                    <Button type="submit" disabled={saving || !name.trim()}>
                        {saving ? "Saving…" : saveLabel}
                    </Button>
                </div>
            </FieldGroup>
        </form>
    );
}
