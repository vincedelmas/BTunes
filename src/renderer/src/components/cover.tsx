import {Disc3} from "lucide-react";
import type {Track} from "../../../shared/contracts";
import {cn} from "@/lib/utils";

export function Cover({
                          track,
                          large = false,
                      }: {
    track?: Track;
    large?: boolean;
}) {
    return (
        <div className={cn("cover", large && "cover-large")}>
            {track?.cover ? (
                <img
                    src={"btunes://cover/" + track.cover}
                    alt={track.album + " album artwork"}
                />
            ) : (
                <Disc3 aria-hidden="true"/>
            )}
        </div>
    );
}
