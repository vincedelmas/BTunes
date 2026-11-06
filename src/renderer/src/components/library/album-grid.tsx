import {Cover} from "@/components/cover";
import {Pencil, Play} from "lucide-react";
import {Button} from "@/components/ui/button";
import type {Track} from "../../../../shared/contracts";


interface AlbumGridProps {
    albums: Track[][];
    onEdit: (tracks: Track[]) => void;
    onPlay: (track: Track, tracks: Track[]) => void;
}


export function AlbumGrid({ albums, onPlay, onEdit }: AlbumGridProps) {
    return (
        <div className="album-grid">
            {albums.map((tracks) => {
                const track = tracks[0];

                return (
                    <article className="album" key={track.artist + "|" + track.album}>
                        <button
                            className="album-artwork"
                            aria-label={"Play " + track.album}
                            onClick={() => onPlay(track, tracks)}
                        >
                            <Cover track={track} large/>
                            <span className="album-play">
                                <Play size={22} fill="currentColor"/>
                            </span>
                        </button>
                        <div className="album-info">
                            <div>
                                <strong>{track.album}</strong>
                                <span>{track.artist}</span>
                                <small>{track.year || "Unknown year"} · {tracks.length} songs</small>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onEdit(tracks)}
                                aria-label={"Edit tags for album " + track.album}
                            >
                                <Pencil/>
                            </Button>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
