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
            getKey={(tracks) => (tracks[0].albumArtist || tracks[0].artist) + "|" + tracks[0].album}
            renderItem={(tracks) => {
                const track = tracks[0];

                return (
                    <TrackContextMenu
                        tracks={tracks}
                        playlists={playlists}
                        actions={actions}
                    >
                        <article
                            className="album min-w-0 rounded-[7px] p-3 [transition:background_0.2s] hover:bg-[#ffffff0a] [&:nth-child(3n_+_2)_.cover-large]:[background:linear-gradient(145deg,_#514258,_#29212d)] [&:nth-child(3n_+_3)_.cover-large]:[background:linear-gradient(145deg,_#56513d,_#27251c)] [&_strong]:block [&_strong]:text-[14px] [&_strong]:font-[650] [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_strong]:mb-[6px] [&:hover_.album-info_>_button]:opacity-[1] [&:focus-within_.album-info_>_button]:opacity-[1] [&:hover_.album-play]:opacity-[1] [&:hover_.album-play]:transform-none [&:focus-within_.album-play]:opacity-[1] [&:focus-within_.album-play]:transform-none">
                            <button
                                className="album-artwork relative w-full p-0 bg-transparent border-0 mb-[14px] rounded-[6px] shadow-[0_8px_24px_#0004]"
                                aria-label={"Play " + track.album}
                                onClick={() => actions.onPlay(track, tracks)}
                            >
                                <Cover
                                    large={true}
                                    track={track}
                                />
                                <span
                                    className="album-play absolute right-[10px] bottom-[10px] bg-primary text-primary-foreground p-[14px] rounded-[50%] opacity-0 [transform:translateY(8px)] [transition:0.2s] shadow-[0_6px_20px_#0005]">
<Play
    size={22}
    fill="currentColor"
/>
</span>
                            </button>
                            <div
                                className="album-info flex items-start justify-between gap-1 [&_>_div]:min-w-0 [&_span]:block [&_span]:text-muted-foreground [&_span]:text-xs [&_span]:mb-[5px] [&_span]:overflow-hidden [&_span]:text-ellipsis [&_span]:whitespace-nowrap [&_>_button]:opacity-0 [&_>_button]:shrink-0 [&_>_button]:mt-[-7px] [&_>_button]:mr-[-7px] [&_>_button]:mb-0 [&_>_button]:ml-0">
                                <div>
                                    <strong title={track.album}>
                                        {track.album}
                                    </strong>
                                    <span title={track.albumArtist || track.artist}>
                                        {track.albumArtist || track.artist}
                                    </span>
                                    <small className="text-[11px] text-muted-foreground">
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
