import {DialogFooter} from "@/components/ui/dialog";
import {Check, Plus} from "lucide-react";
import {rpc} from "@/lib/rpc";
import {useState} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {FilterSelect} from "@/components/filter-select";
import type {Playlist} from "../../../../shared/types/library";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";


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

        try {
            const details = { name, rule: rule || undefined };
            let id: number;

            if (playlist) {
                await rpc("playlist.update", { id: playlist.id, ...details });
                id = playlist.id;
            }
            else {
                id = await rpc("playlist.create", details);
            }

            await onSaved(id);
        }
        catch (error) {
            onError(error);
        }
        finally {
            setSaving(false);
        }
    }

    return (
        <form
            className="playlist-form flex flex-col"
            onSubmit={(ev) => {
                ev.preventDefault();
                void save();
            }}
        >
            <FieldGroup className="gap-5 px-7 py-6">
                <Field>
                    <FieldLabel htmlFor="playlist-name">
                        Playlist name
                    </FieldLabel>
                    <Input
                        className="h-11"
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
                        className="h-11 w-full max-w-none"
                        value={rule}
                        disabled={saving}
                        id="playlist-rule"
                        onChange={setRule}
                        label="Automatic genre rule"
                        placeholder="Classic playlist"
                        options={rules.map((genre) => ({ value: genre, label: genre }))}
                    />
                    <FieldDescription>{rule ? "Songs matching this genre appear here automatically." : "A classic playlist you fill with your own selection of songs."}</FieldDescription>
                </Field>
            </FieldGroup>
            <DialogFooter className="m-0 rounded-none px-7 py-4">
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
                    {playlist ? <Check data-icon="inline-start"/> : <Plus data-icon="inline-start"/>}
                    {saving ? "Saving…" : saveLabel}
                </Button>
            </DialogFooter>
        </form>
    );
}
