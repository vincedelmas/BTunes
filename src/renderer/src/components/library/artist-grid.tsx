import {useMemo} from "react";
import type {Track} from "../../../../shared/types/library";
import {Cover} from "@/components/cover";
import {VirtualGrid} from "@/components/virtual-grid";

export function ArtistGrid({ tracks, onArtist }: { tracks: Track[]; onArtist: (artist: string) => void }) {
    const artists = useMemo(() => {
        const groups = new Map<string, { name: string; track: Track; count: number }>();

        for (const track of tracks) {
            const artist = groups.get(track.artist);
            if (artist) artist.count++;
            else groups.set(track.artist, { name: track.artist, track, count: 1 });
        }

        return [...groups.values()];
    }, [tracks]);

    return (
        <VirtualGrid items={artists} label="Artists" getKey={(artist) => artist.name} renderItem={(artist) => (
            <button className="artist" onClick={() => onArtist(artist.name)}>
                <Cover track={artist.track} large/>
                <h2>{artist.name}</h2>
                <p>Artist · {artist.count} songs</p>
            </button>
        )}/>
    );
}
