import {cn} from "@/lib/utils";
import {Disc3} from "lucide-react";
import type {Track} from "../../../shared/types/library";


interface CoverProps {
    track?: Track;
    large?: boolean;
}


export function Cover({ track, large = false }: CoverProps) {
    return (
        <div className={cn("cover", large && "cover-large")}>
            {track?.cover ?
                <img
                    loading="lazy"
                    decoding="async"
                    alt={track.album + " album artwork"}
                    src={"btunes://cover/" + track.cover}
                />
                :
                <Disc3 aria-hidden="true"/>
            }
        </div>
    );
}
