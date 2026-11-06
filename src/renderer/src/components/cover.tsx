import {cn} from "@/lib/utils";
import {Disc3} from "lucide-react";
import type {Track} from "../../../shared/types/library";


interface CoverProps {
    track?: Track;
    large?: boolean;
    source?: string;
}


export function Cover({ track, large = false, source }: CoverProps) {
    return (
        <div
            className={cn("cover size-[42px] rounded-md bg-secondary flex items-center justify-center shrink-0 overflow-hidden text-muted-foreground", large && "cover-large w-full h-auto aspect-square bg-linear-to-br from-secondary to-card")}>
            {source || track?.cover ?
                <img
                    className="size-full object-cover"
                    loading="lazy"
                    decoding="async"
                    alt={(track?.album ?? "Selected") + " album artwork"}
                    src={source ?? "btunes://cover/" + track?.cover}
                />
                :
                <Disc3
                    aria-hidden="true"
                    className={cn(large && "size-[44%] stroke-[0.8]")}
                />
            }
        </div>
    );
}
