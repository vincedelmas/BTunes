import type {Appearance} from "@/types/appearance";
import {usePreference} from "@/hooks/use-preference";
import {appearanceSchema} from "../../../shared/schemas/preferences";


export function useAppearance() {
    return usePreference<Appearance>("btunes.appearance.v1", appearanceSchema, {
        visualizer: "spectrum",
        sidebarArtwork: true,
    });
}
