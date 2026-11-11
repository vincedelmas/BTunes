import {ArrowLeft, X} from "lucide-react";
import {Button} from "@/components/ui/button";


interface FilterBarProps {
    artist: string;
    search: string;
    onClear: () => void;
    onArtist: (value: string) => void;
}


export function FilterBar({ artist, search, onArtist, onClear }: FilterBarProps) {
    if (!artist && !search) return null;

    return (
        <div
            aria-label="Active filters"
            className="filter-bar mb-3 flex shrink-0 flex-wrap items-center gap-2"
        >
            <Button
                size="sm"
                variant="ghost"
                onClick={onClear}
                aria-label="Show all songs"
            >
                <ArrowLeft data-icon="inline-start"/>
                All songs
            </Button>
            {artist && (
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onArtist("")}
                    aria-label="Clear artist filter"
                >
                    {artist}
                    <X data-icon="inline-end"/>
                </Button>
            )}
            {search && (
                <span className="text-xs text-muted-foreground">
                    Search: "
                    {search}
                    "
                </span>
            )}
        </div>
    );
}
