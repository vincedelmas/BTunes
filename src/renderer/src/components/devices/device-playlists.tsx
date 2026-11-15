import {Checkbox} from "@/components/ui/checkbox";
import type {Playlist} from "../../../../shared/types/library";
import {playlistFilenames} from "../../../../shared/device-playlists";
import {Field, FieldGroup, FieldLabel, FieldSet, FieldLegend, FieldDescription} from "@/components/ui/field";


interface DevicePlaylistsProps {
    disabled: boolean;
    selected: number[];
    playlists: Playlist[];
    onToggle: (id: number, checked: boolean) => void;
}


export function DevicePlaylists({ disabled, selected, playlists, onToggle }: DevicePlaylistsProps) {
    const filenames = playlistFilenames(playlists);

    return (
        <FieldSet disabled={disabled}>
            <FieldLegend>
                Playlist files · optional
            </FieldLegend>
            <FieldDescription>
                Export only the playlists you check. These small files organize songs already on your phone;
                they do not create extra audio copies. Leave everything unchecked to copy music only.
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
                        <div className="flex min-w-0 flex-col gap-1">
                            <FieldLabel htmlFor={"device-playlist-" + playlist.id}>
                                {playlist.name}
                            </FieldLabel>
                            <FieldDescription className="break-words">
                                {filenames.get(playlist.id)}
                            </FieldDescription>
                        </div>
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
