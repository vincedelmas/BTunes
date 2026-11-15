import {Checkbox} from "@/components/ui/checkbox";
import type {Playlist} from "../../../../shared/types/library";
import {Field, FieldGroup, FieldLabel, FieldSet, FieldLegend, FieldDescription} from "@/components/ui/field";


interface DevicePlaylistsProps {
    disabled: boolean;
    selected: number[];
    playlists: Playlist[];
    onToggle: (id: number, checked: boolean) => void;
}


export function DevicePlaylists({ disabled, selected, playlists, onToggle }: DevicePlaylistsProps) {
    return (
        <FieldSet disabled={disabled}>
            <FieldLegend>
                Playlists to sync
            </FieldLegend>
            <FieldDescription>
                Check the playlists to export, then compare again after changing your selection.
                Missing songs from the whole PC library will still be copied. Unchecked playlists on the phone are kept.
            </FieldDescription>
            <FieldGroup>
                {playlists.map((playlist) => (
                    <Field key={playlist.id} orientation="horizontal">
                        <Checkbox
                            disabled={disabled}
                            id={"device-playlist-" + playlist.id}
                            checked={selected.includes(playlist.id)}
                            onCheckedChange={(checked) => onToggle(playlist.id, checked === true)}
                        />
                        <FieldLabel htmlFor={"device-playlist-" + playlist.id}>
                            {playlist.name}
                        </FieldLabel>
                    </Field>
                ))}
            </FieldGroup>
            {!playlists.length &&
                <FieldDescription>
                    Create a playlist in your library to export it here.
                </FieldDescription>
            }
        </FieldSet>
    );
}
