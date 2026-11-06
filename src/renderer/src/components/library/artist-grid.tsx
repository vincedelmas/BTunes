import {Cover} from "@/components/cover";
import {VirtualGrid} from "@/components/virtual-grid";
import type {Track} from "../../../../shared/types/library";


interface ArtistGridProps {
    tracks: Track[];
    onArtist: (artist: string) => void;
}


export function ArtistGrid({ tracks, onArtist }: ArtistGridProps) {
    const groups = new Map<string, { name: string; track: Track; count: number }>();

    for (const track of tracks) {
        const artist = groups.get(track.artist);

        if (artist) {
            artist.count++;
        }
        else {
            groups.set(track.artist, { name: track.artist, track, count: 1 });
        }
    }

    const artists = [...groups.values()];

    return (
        <VirtualGrid
            items={artists}
            label="Artists"
            getKey={(artist) => artist.name}
            renderItem={(artist) => (
                <button
                    className="artist bg-transparent border-0 text-left p-3 [&_.cover]:rounded-[50%] [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:overflow-hidden [&_h2]:text-ellipsis [&_h2]:whitespace-nowrap [&_p]:text-muted-foreground [&_p]:text-xs"
                    onClick={() => onArtist(artist.name)}
                >
                    <Cover
                        large={true}
                        track={artist.track}
                    />
                    <h2>{artist.name}</h2>
                    <p>Artist · {artist.count} songs</p>
                </button>
            )}
        />
    );
}
