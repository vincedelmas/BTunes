import {rpc} from "@/lib/rpc";
import {useState} from "react";
import {Check, Plus} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {DialogFooter} from "@/components/ui/dialog";
import {FilterSelect} from "@/components/filter-select";
import type {Playlist} from "../../../../shared/types/library";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";


interface PlaylistFormProps {
    pinned: boolean;
    canPin: boolean;
    genres: string[];
    playlist?: Playlist;
    onCancel: () => void;
    onError: (error: unknown) => void;
    onSaved: (id: number, pinned: boolean) => Promise<void>;
}


export function PlaylistForm({ playlist, pinned, canPin, genres, onSaved, onCancel, onError }: PlaylistFormProps) {
    const [pin, setPin] = useState(pinned);
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

            await onSaved(id, pin);
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
                        value={name}
                        maxLength={100}
                        className="h-11"
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
                        className="h-11 w-full max-w-none"
                        options={rules.map((genre) => ({ value: genre, label: genre }))}
                    />
                    <FieldDescription>
                        {rule ? "Songs matching this genre appear here automatically." : "Add and remove songs manually."}
                    </FieldDescription>
                </Field>
                <Field orientation="horizontal">
                    <Checkbox
                        checked={pin}
                        id="playlist-pin"
                        disabled={saving || (!pinned && !canPin)}
                        onCheckedChange={(checked) => setPin(Boolean(checked))}
                    />
                    <div className="flex flex-col gap-1">
                        <FieldLabel htmlFor="playlist-pin">
                            Pin to main sidebar
                        </FieldLabel>
                        <FieldDescription>
                            {!pinned && !canPin ? "Three playlists are already pinned. Unpin one to make room." : "Keep this playlist at hand. Up to three playlists can be pinned."}
                        </FieldDescription>
                    </div>
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
                    {playlist ? (
                        <Check data-icon="inline-start"/>
                    ) : (
                        <Plus data-icon="inline-start"/>
                    )}
                    {saving ? "Saving…" : saveLabel}
                </Button>
            </DialogFooter>
        </form>
    );
}
