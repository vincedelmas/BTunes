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
            className={cn("cover w-[42px] h-[42px] rounded-sm bg-[#282828] flex items-center justify-center shrink-0 overflow-hidden text-[#aaa]", large && "cover-large w-full h-auto aspect-square [background:linear-gradient(145deg,_#384e45,_#192c25)] [&_>_svg]:w-[44%] [&_>_svg]:h-[44%] [&_>_svg]:stroke-[0.8]")}>
            {source || track?.cover ?
                <img
                    className="size-full object-cover"
                    loading="lazy"
                    decoding="async"
                    alt={(track?.album ?? "Selected") + " album artwork"}
                    src={source ?? "btunes://cover/" + track?.cover}
                />
                :
                <Disc3 aria-hidden="true"/>
            }
        </div>
    );
}
