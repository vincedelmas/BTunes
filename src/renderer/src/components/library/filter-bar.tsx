import {ArrowDownUp, ArrowLeft, X} from "lucide-react";
import type {TrackSort, TrackSortField} from "../../../../shared/track-sorting";
import {FilterSelect} from "@/components/filter-select";
import {Button} from "@/components/ui/button";

const sortOptions = [
    { value: "title", label: "Title" },
    { value: "artist", label: "Artist" },
    { value: "album", label: "Album" },
    { value: "year", label: "Year" },
    { value: "plays", label: "Play count" },
];

export function FilterBar({ genre, artist, search, genres, artists, sort, showSort, onGenre, onArtist, onSort, onClear }: {
    genre: string;
    artist: string;
    search: string;
    genres: string[];
    artists: string[];
    sort: TrackSort;
    showSort: boolean;
    onGenre: (value: string) => void;
    onArtist: (value: string) => void;
    onSort: (sort: TrackSort) => void;
    onClear: () => void;
}) {
    const filtered = Boolean(genre || artist || search);

    return (
        <div className="filter-bar">
            <div className="filter-controls">
                <FilterSelect label="Filter by genre" placeholder="All genres" value={genre} options={genres.map((name) => ({ value: name, label: name }))} onChange={onGenre}/>
                <FilterSelect label="Filter by artist" placeholder="All artists" value={artist} options={artists.map((name) => ({ value: name, label: name }))}
                              onChange={onArtist}/>
                {showSort && <div className="grid-sort">
                    <FilterSelect label="Sort collection" placeholder="Title" value={sort.field} options={sortOptions}
                                  onChange={(field) => onSort({ ...sort, field: field as TrackSortField })}/>
                    <Button variant="ghost" size="icon" aria-label="Reverse sort order" aria-pressed={sort.descending}
                            onClick={() => onSort({ ...sort, descending: !sort.descending })}><ArrowDownUp/></Button>
                </div>}
            </div>
            {filtered && <div className="active-filters" aria-label="Active filters">
                <Button variant="ghost" size="sm" onClick={onClear} aria-label="Show all songs"><ArrowLeft/>All songs</Button>
                {artist && <Button variant="secondary" size="sm" onClick={() => onArtist("")} aria-label="Clear artist filter">{artist}<X/></Button>}
                {genre && <Button variant="secondary" size="sm" onClick={() => onGenre("")} aria-label="Clear genre filter">{genre}<X/></Button>}
                {search && <span className="filter-search-label">Search: “{search}”</span>}
            </div>}
        </div>
    );
}
