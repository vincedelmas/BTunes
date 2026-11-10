import {cn} from "@/lib/utils";
import {albumKey, formatDuration, getAlbumArtist} from "@/lib/music";
import {Clock3} from "lucide-react";
import type {Track} from "../../../../shared/types/library";


interface LibraryStatsProps {
    tracks: Track[];
    className?: string;
}


export function LibraryStats({ tracks, className }: LibraryStatsProps) {
    const albums = new Set<string>();
    const artists = new Set<string>();
    let duration = 0;

    for (const track of tracks) {
        albums.add(albumKey(track));
        artists.add(getAlbumArtist(track));
        if (Number.isFinite(track.duration)) duration += Math.max(0, track.duration);
    }

    return (
        <p className={cn("library-stats flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}>
            <span>
                {tracks.length} {tracks.length === 1 ? "song" : "songs"}
            </span>
            <span aria-hidden="true">·</span>
            <span>
                {albums.size} {albums.size === 1 ? "album" : "albums"}
            </span>
            <span aria-hidden="true">·</span>
            <span>
                {artists.size} {artists.size === 1 ? "artist" : "artists"}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5 text-info" aria-label="Total duration">
                <Clock3 className="size-3" aria-hidden="true"/>
                {formatDuration(duration)}
            </span>
        </p>
    );
}
