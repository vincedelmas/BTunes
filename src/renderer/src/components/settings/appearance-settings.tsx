import type {RefObject} from "react";
import type {Appearance} from "@/types/appearance";
import {SettingsSection} from "@/components/settings/settings-section";
import {SoundVisualizer} from "@/components/player/sound-visualizer";
import {FilterSelect} from "@/components/filter-select";
import {Checkbox} from "@/components/ui/checkbox";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";
import {appearanceSchema} from "../../../../shared/schemas/preferences";


interface AppearanceSettingsProps {
    appearance: Appearance;
    analyser: RefObject<AnalyserNode | null>;
    playing: boolean;
    onChange: (appearance: Appearance) => void;
}


export function AppearanceSettings({ appearance, analyser, playing, onChange }: AppearanceSettingsProps) {
    return (
        <SettingsSection title="Appearance" description="Choose how your music looks while you listen.">
            <FieldGroup>
                <Field>
                    <FieldLabel htmlFor="visualizer-style">Sound visualizer</FieldLabel>
                    <FilterSelect
                        id="visualizer-style"
                        label="Visualizer style"
                        value={appearance.visualizer}
                        allowEmpty={false}
                        placeholder="Choose a visualizer"
                        options={[
                            { value: "spectrum", label: "Spectrum" },
                            { value: "waveform", label: "Waveform" },
                            { value: "orbit", label: "Orbit" },
                            { value: "off", label: "Off" },
                        ]}
                        onChange={(value) => onChange(appearanceSchema.parse({ ...appearance, visualizer: value }))}
                    />
                    <FieldDescription>The header reacts to the playing audio. Animation pauses when playback stops or the app is hidden.</FieldDescription>
                </Field>
                {appearance.visualizer !== "off" && <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-info/5 px-4 py-3">
                    <p className="text-xs text-muted-foreground">{playing ? "Live preview" : "Play a song to see it respond"}</p>
                    <SoundVisualizer analyser={analyser} style={appearance.visualizer} playing={playing}/>
                </div>}
                <Field orientation="horizontal">
                    <Checkbox
                        id="sidebar-artwork"
                        checked={appearance.sidebarArtwork}
                        onCheckedChange={(checked) => onChange({ ...appearance, sidebarArtwork: Boolean(checked) })}
                    />
                    <div className="flex flex-col gap-1">
                        <FieldLabel htmlFor="sidebar-artwork">Show now-playing artwork in the sidebar</FieldLabel>
                        <FieldDescription>Show the album cover, song, and artist. You can also collapse this from the sidebar.</FieldDescription>
                    </div>
                </Field>
            </FieldGroup>
        </SettingsSection>
    );
}
