import {Button} from "@/components/ui/button";
import {Separator} from "@/components/ui/separator";
import {HardDriveDownload, ListMusic} from "lucide-react";
import type {Playlist} from "../../../../shared/types/library";
import {DevicePlaylists} from "@/components/devices/device-playlists";
import {SettingsSection} from "@/components/settings/settings-section";


interface DeviceSyncOptionsProps {
    disabled: boolean;
    selected: number[];
    playlists: Playlist[];
    onCompare: () => void;
    onToggle: (id: number, checked: boolean) => void;
}


export function DeviceSyncOptions({ disabled, selected, playlists, onCompare, onToggle }: DeviceSyncOptionsProps) {
    return (
        <SettingsSection
            title="2. Choose what to sync"
            description="Music files and playlist files are different. Review both before starting the transfer."
        >
            <div className="flex flex-col gap-5">
                <div className="flex items-start gap-3">
                    <HardDriveDownload aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground"/>
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">
                            Music files · always included
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Copy songs missing from your phone from the whole PC library.
                            Existing audio and phone-only songs are kept.
                            Checking a playlist below does not limit which songs are copied.
                        </p>
                    </div>
                </div>
                <Separator/>
                <DevicePlaylists
                    selected={selected}
                    disabled={disabled}
                    onToggle={onToggle}
                    playlists={playlists}
                />
                <div className="flex flex-wrap items-center gap-3">
                    <Button disabled={disabled} onClick={onCompare}>
                        <ListMusic data-icon="inline-start"/>
                        Review sync
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        {selected.length}
                        {" "}
                        playlists selected. Changing this selection requires a new review.
                    </p>
                </div>
            </div>
        </SettingsSection>
    );
}
