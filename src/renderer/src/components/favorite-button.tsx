import {Heart} from "lucide-react";
import type {Track} from "../../../shared/contracts";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";

export function FavoriteButton({
                                   track,
                                   onToggle,
                               }: {
    track: Track;
    onToggle: (track: Track) => void;
}) {
    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label={
                track.favorite ? "Remove from liked songs" : "Add to liked songs"
            }
            aria-pressed={Boolean(track.favorite)}
            className={cn(track.favorite && "enabled")}
            onClick={() => onToggle(track)}
        >
            <Heart fill={track.favorite ? "currentColor" : "none"}/>
        </Button>
    );
}
