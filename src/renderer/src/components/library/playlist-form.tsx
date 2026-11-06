import {rpc} from "@/lib/rpc";
import {useState} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {FilterSelect} from "@/components/filter-select";
import type {Playlist} from "../../../../shared/types/library";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";


interface PlaylistFormProps {
    genres: string[];
    playlist?: Playlist;
    onCancel: () => void;
    onError: (error: unknown) => void;
    onSaved: (id: number) => Promise<void>;
}


export function PlaylistForm({ playlist, genres, onSaved, onCancel, onError }: PlaylistFormProps) {
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState(playlist?.name ?? "");
    const [rule, setRule] = useState(playlist?.rule ?? "");
    const rules = [...new Set([...genres, ...(playlist?.rule ? [playlist.rule] : [])])];

    const saveLabel = playlist ? "Save playlist" : "Create playlist";

    async function save() {
        setSaving(true);

        await Promise.resolve()
            .then(async () => {
                const details = { name, rule: rule || undefined };

                if (playlist) {
                    await rpc("playlist.update", { id: playlist.id, ...details });
                    return playlist.id;
                }

                return rpc("playlist.create", details);
            })
            .then(onSaved)
            .catch(onError)
            .finally(() => setSaving(false));
    }

    return (
        <form
            className="playlist-form p-[10px] gap-4"
            onSubmit={(ev) => {
                ev.preventDefault();
                void save();
            }}
        >
            <FieldGroup>
                <Field>
                    <FieldLabel htmlFor="playlist-name">
                        Playlist name
                    </FieldLabel>
                    <Input
                        value={name}
                        maxLength={100}
                        disabled={saving}
                        id="playlist-name"
                        placeholder="My playlist"
                        onChange={(ev) => setName(ev.target.value)}
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
                        options={rules.map((genre) => ({ value: genre, label: genre }))}
                    />
                </Field>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={saving}
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={saving || !name.trim()}
                    >
                        {saving ? "Saving…" : saveLabel}
                    </Button>
                </div>
            </FieldGroup>
        </form>
    );
}
