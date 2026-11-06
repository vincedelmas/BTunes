import {cn} from "@/lib/utils";
import {getAlbumArtist, groupAlbums} from "@/lib/music";
import type {Track} from "../../../../shared/types/library";


interface LibraryStatsProps {
    tracks: Track[];
    className?: string;
}


export function LibraryStats({ tracks, className }: LibraryStatsProps) {
    const albums = groupAlbums(tracks).length;
    const albumArtists = new Set(tracks.map(getAlbumArtist)).size;

    return (
        <p className={cn("library-stats flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}>
<span>
                {tracks.length} {tracks.length === 1 ? "song" : "songs"}
            </span>
            <span aria-hidden="true">·</span>
            <span>
                {albums} {albums === 1 ? "album" : "albums"}
            </span>
            <span aria-hidden="true">·</span>
            <span>
                {albumArtists} {albumArtists === 1 ? "album artist" : "album artists"}
            </span>
        </p>
    );
}
