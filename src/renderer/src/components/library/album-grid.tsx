import {Cover} from "@/components/cover";
import {Pencil, Play} from "lucide-react";
import {Button} from "@/components/ui/button";
import {VirtualGrid} from "@/components/virtual-grid";
import type {TrackActions} from "@/types/track-actions";
import type {Playlist, Track} from "../../../../shared/types/library";
import {TrackContextMenu} from "@/components/library/track-context-menu";


interface AlbumGridProps {
    albums: Track[][];
    playlists: Playlist[];
    actions: TrackActions;
}


export function AlbumGrid({ albums, playlists, actions }: AlbumGridProps) {
    return (
        <VirtualGrid
            items={albums}
            label="Albums"
            getKey={(tracks) => tracks[0].artist + "|" + tracks[0].album}
            renderItem={(tracks) => {
                const track = tracks[0];

                return (
                    <TrackContextMenu tracks={tracks} playlists={playlists} actions={actions}>
                        <article className="album">
                            <button
                                className="album-artwork"
                                aria-label={"Play " + track.album}
                                onClick={() => actions.onPlay(track, tracks)}
                            >
                                <Cover
                                    large={true}
                                    track={track}
                                />
                                <span className="album-play">
                                    <Play size={22} fill="currentColor"/>
                                </span>
                            </button>
                            <div className="album-info">
                                <div>
                                    <strong title={track.album}>
                                        {track.album}
                                    </strong>
                                    <span title={track.artist}>
                                        {track.artist}
                                    </span>
                                    <small>
                                        {track.year || "Unknown year"} · {tracks.length} songs
                                    </small>
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => actions.onEdit(tracks)}
                                    aria-label={"Edit tags for album " + track.album}
                                >
                                    <Pencil/>
                                </Button>
                            </div>
                        </article>
                    </TrackContextMenu>
                );
            }}
        />
    );
}
