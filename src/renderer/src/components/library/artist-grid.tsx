import {getAlbumArtist} from "@/lib/music";
import type {ItemReveal} from "@/types/reveal";
import {NowPlayingBadge} from "@/components/player/now-playing-badge";
import {Cover} from "@/components/cover";
import {VirtualGrid} from "@/components/virtual-grid";
import type {Track} from "../../../../shared/types/library";


interface ArtistGridProps {
    tracks: Track[];
    currentTrack?: Track;
    reveal?: ItemReveal;
    onRevealed: () => void;
    onArtist: (artist: string) => void;
}


export function ArtistGrid({ currentTrack, reveal, onRevealed, tracks, onArtist }: ArtistGridProps) {
    const groups = new Map<string, { name: string; track: Track; count: number }>();

    for (const track of tracks) {
        const name = getAlbumArtist(track);
        const artist = groups.get(name);

        if (artist) {
            artist.count++;
        }
        else {
            groups.set(name, { name, track, count: 1 });
        }
    }

    const artists = [...groups.values()];

    return (
        <VirtualGrid
            items={artists}
            label="Artists"
            reveal={reveal}
            onRevealed={onRevealed}
            getKey={(artist) => artist.name}
            renderItem={(artist) => (
                <button
                    data-artist={artist.name}
                    aria-current={currentTrack && getAlbumArtist(currentTrack) === artist.name ? true : undefined}
                    className="artist w-full min-w-0 rounded-xl border border-transparent bg-transparent p-3 text-left transition-colors hover:bg-card focus-visible:border-primary focus-visible:outline-none aria-current:border-primary/60 aria-current:bg-primary/5"
                    onClick={() => onArtist(artist.name)}
                >
                    <div className="relative mb-4 [&_.cover]:rounded-full">
                        <Cover
                            large
                            track={artist.track}
                        />
                        {currentTrack && getAlbumArtist(currentTrack) === artist.name && <NowPlayingBadge/>}
                    </div>
                    <h2 className="truncate text-base font-bold">{artist.name}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Artist · {artist.count} {artist.count === 1 ? "song" : "songs"}</p>
                </button>
            )}
        />
    );
}
