import {Button} from "@/components/ui/button";
import {EmptyState} from "@/components/empty-state";
import {Brain, CopyCheck, Disc3, FilterX, History, ListMusic, Settings} from "lucide-react";


interface CollectionEmptyStateProps {
    view: string;
    hasTracks: boolean;
    hasFolders: boolean;
    hasFilters: boolean;
    onSettings: () => void;
    onClearFilters: () => void;
}


export function CollectionEmptyState({ view, hasTracks, hasFolders, hasFilters, onClearFilters, onSettings }: CollectionEmptyStateProps) {
    if (hasFilters) {
        return (
            <EmptyState
                icon={FilterX}
                title="No matching songs"
                description="No songs match your search and filters."
            >
                <Button variant="outline" onClick={onClearFilters}>
                    Clear search and filters
                </Button>
            </EmptyState>
        );
    }

    if (view === "duplicates") {
        return (
            <EmptyState
                icon={CopyCheck}
                title="No duplicates"
                description="No songs have matching titles, artists, and durations."
            />
        );
    }

    if (view === "history") {
        return (
            <EmptyState
                icon={History}
                title="No listening history yet"
                description="Played songs appear here."
            />
        );
    }

    if (view.startsWith("playlist:")) {
        return (
            <EmptyState
                icon={ListMusic}
                title="This playlist is empty"
                description="Right-click a song and choose Add to playlist. Automatic playlists fill when songs match their rule."
            />
        );
    }

    if (view.startsWith("mix:")) {
        return (
            <EmptyState
                icon={Brain}
                title="No songs in this mix"
                description="This mix updates automatically as you add music and listen."
            />
        );
    }

    if (!hasTracks && hasFolders) {
        return (
            <EmptyState
                icon={Disc3}
                title="No songs indexed yet"
                description="Your folders are configured. Check them in Settings or wait for indexing to finish."
            >
                <Button variant="outline" onClick={onSettings}>
                    <Settings/>
                    Open Settings
                </Button>
            </EmptyState>
        );
    }

    return (
        <EmptyState
            icon={Disc3}
            title="No music folders"
            description="Add a music folder in Settings to index its audio files."
        >
            <Button onClick={onSettings}>
                <Settings/>
                Open Settings
            </Button>
        </EmptyState>
    );
}
