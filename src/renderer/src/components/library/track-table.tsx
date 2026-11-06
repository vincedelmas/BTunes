import {cn} from "@/lib/utils";
import {formatTime} from "@/lib/music";
import {Cover} from "@/components/cover";
import {Button} from "@/components/ui/button";
import {Pencil, Play, Volume2} from "lucide-react";
import {FilterSelect} from "@/components/filter-select";
import {FavoriteButton} from "@/components/favorite-button";
import type {Playlist, Track} from "../../../../shared/contracts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";


interface TrackTableProps {
    tracks: Track[];
    playing: boolean;
    selected: number[];
    currentId?: number;
    playlists: Playlist[];
    onPlay: (track: Track) => void;
    onSelect: (ids: number[]) => void;
    onEdit: (tracks: Track[]) => void;
    onFavorite: (track: Track) => void;
    onAdd: (playlistId: number, trackId: number) => void;
}


export function TrackTable({ tracks, playlists, currentId, playing, selected, onSelect, onPlay, onFavorite, onEdit, onAdd }: TrackTableProps) {
    const allSelected = tracks.length > 0 && tracks.every((track) => selected.includes(track.id));

    function toggleSelection(track: Track, checked: boolean) {
        onSelect(checked ? [...selected, track.id] : selected.filter((id) => id !== track.id));
    }

    return (
        <Table className="track-table">
            <TableHeader>
                <TableRow>
                    <TableHead>
                        <input
                            type="checkbox"
                            checked={allSelected}
                            aria-label="Select all visible songs"
                            onChange={(ev) => onSelect(ev.target.checked ? tracks.map((track) => track.id) : [])}
                        />
                    </TableHead>
                    <TableHead>#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Album</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>
                        <span className="sr-only">Actions</span>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tracks.map((track) => (
                    <TableRow
                        key={track.id}
                        onDoubleClick={() => onPlay(track)}
                        className={cn(currentId === track.id && "is-current")}
                    >
                        <TableCell>
                            <input
                                type="checkbox"
                                aria-label={"Select " + track.title}
                                checked={selected.includes(track.id)}
                                onChange={(ev) => toggleSelection(track, ev.target.checked)}
                            />
                        </TableCell>
                        <TableCell>
                            <Button
                                size="icon"
                                variant="ghost"
                                aria-label={"Play " + track.title}
                                onClick={() => onPlay(track)}
                            >
                                {currentId === track.id && playing ? <Volume2/> : <Play/>}
                            </Button>
                        </TableCell>
                        <TableCell>
                            <div className="track-cell">
                                <Cover track={track}/>
                                <div>
                                    <strong>{track.title}</strong>
                                    <small>{track.artist}</small>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>{track.album}</TableCell>
                        <TableCell>{track.genre}</TableCell>
                        <TableCell>{formatTime(track.duration)}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1">
                                <FavoriteButton track={track} onToggle={onFavorite}/>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => onEdit([track])}
                                    aria-label={"Edit tags for " + track.title}
                                >
                                    <Pencil/>
                                </Button>
                                <FilterSelect
                                    value=""
                                    placeholder="+ Playlist"
                                    label={"Add " + track.title + " to a playlist"}
                                    onChange={(value) => {
                                        if (value) onAdd(Number(value), track.id);
                                    }}
                                    options={playlists
                                        .filter((playlist) => !playlist.rule)
                                        .map((playlist) => ({
                                            label: playlist.name,
                                            value: String(playlist.id),
                                        }))}
                                />
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
