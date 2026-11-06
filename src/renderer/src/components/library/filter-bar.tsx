import {Button} from "@/components/ui/button";
import {ArrowDownUp, ArrowLeft, X} from "lucide-react";
import {FilterSelect} from "@/components/filter-select";
import type {TrackSort, TrackSortField} from "../../../../shared/types/track-sorting";


const sortOptions = [
    { value: "title", label: "Title" },
    { value: "artist", label: "Artist" },
    { value: "album", label: "Album" },
    { value: "genre", label: "Genre" },
    { value: "duration", label: "Duration" },
    { value: "year", label: "Year" },
    { value: "plays", label: "Play count" },
    { value: "lastPlayed", label: "Recently played" },
] satisfies { value: TrackSortField; label: string }[];


interface FilterBarProps {
    genre: string;
    artist: string;
    search: string;
    sort: TrackSort;
    genres: string[];
    artists: string[];
    showSort: boolean;
    onClear: () => void;
    showControls?: boolean;
    onGenre: (value: string) => void;
    onArtist: (value: string) => void;
    onSort: (sort: TrackSort) => void;
}


export function FilterBar({ genre, artist, search, genres, artists, sort, showSort, showControls = true, onGenre, onArtist, onSort, onClear }: FilterBarProps) {
    const filtered = Boolean(genre || artist || search);

    function changeSort(field: string) {
        const option = sortOptions.find((item) => item.value === field);
        onSort({ ...sort, field: option?.value ?? "title" });
    }

    if (!showControls && !filtered) return null;

    return (
        <div className="filter-bar shrink-0 mb-[18px]">
            {showControls && <div className="filter-controls flex items-center gap-[10px] flex-wrap">
                <FilterSelect
                    value={genre}
                    onChange={onGenre}
                    label="Filter by genre"
                    placeholder="All genres"
                    options={genres.map((name) => ({ value: name, label: name }))}
                />
                <FilterSelect
                    value={artist}
                    onChange={onArtist}
                    label="Filter by artist"
                    placeholder="All artists"
                    options={artists.map((name) => ({ value: name, label: name }))}
                />
                {showSort && <div className="grid-sort flex items-center gap-[10px] flex-wrap ml-auto">
                    <FilterSelect
                        value={sort.field}
                        placeholder="Title"
                        options={sortOptions}
                        onChange={changeSort}
                        label="Sort collection"
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        aria-pressed={sort.descending}
                        aria-label="Reverse sort order"
                        onClick={() => onSort({ ...sort, descending: !sort.descending })}
                    >
                        <ArrowDownUp/>
                    </Button>
                </div>}
            </div>}
            {filtered &&
                <div
                    className="active-filters flex items-center gap-[10px] flex-wrap mt-[14px] [&_>_[data-variant=ghost]]:pl-0 [&_>_[data-variant=ghost]]:text-primary"
                    aria-label="Active filters"
                >
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onClear}
                        aria-label="Show all songs"
                    >
                        <ArrowLeft/>
                        All songs
                    </Button>

                    {artist &&
                        <Button
                            size="sm"
                            variant="secondary"
                            aria-label="Clear artist filter"
                            onClick={() => onArtist("")}
                        >
                            {artist}
                            <X/>
                        </Button>
                    }

                    {genre &&
                        <Button
                            size="sm"
                            variant="secondary"
                            aria-label="Clear genre filter"
                            onClick={() => onGenre("")}
                        >
                            {genre}
                            <X/>
                        </Button>
                    }

                    {search &&
                        <span className="filter-search-label text-xs text-muted-foreground">
                            Search: "{search}"
                        </span>
                    }
                </div>
            }
        </div>
    );
}
