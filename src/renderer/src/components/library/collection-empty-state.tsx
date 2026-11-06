import {CopyCheck, Disc3, FilterX, History, ListMusic, Settings} from "lucide-react";
import {EmptyState} from "@/components/empty-state";
import {Button} from "@/components/ui/button";

interface CollectionEmptyStateProps {
    view: string;
    hasTracks: boolean;
    hasFolders: boolean;
    hasFilters: boolean;
    onClearFilters: () => void;
    onSettings: () => void;
}


export function CollectionEmptyState({ view, hasTracks, hasFolders, hasFilters, onClearFilters, onSettings }: CollectionEmptyStateProps) {
    if (hasFilters) {
        return <EmptyState icon={FilterX} title="No matching songs" description="No songs match your search and filters.">
            <Button variant="outline" onClick={onClearFilters}>Clear search and filters</Button>
        </EmptyState>;
    }

    if (view === "duplicates") {
        return <EmptyState icon={CopyCheck} title="No possible duplicates"
                           description="No indexed songs share the same title, artist, and rounded duration. Your collection looks tidy."/>;
    }

    if (view === "history") {
        return <EmptyState icon={History} title="No listening history yet" description="Play a song to start building your listening history."/>;
    }

    if (view.startsWith("playlist:")) {
        return <EmptyState icon={ListMusic} title="This playlist is empty"
                           description="Right-click a song and choose Add to playlist. Automatic playlists fill when songs match their rule."/>;
    }

    if (!hasTracks && hasFolders) {
        return <EmptyState icon={Disc3} title="No songs indexed yet" description="Your folders are configured. Check them in Settings or wait for indexing to finish.">
            <Button variant="outline" onClick={onSettings}>
                <Settings/>Open Settings</Button>
        </EmptyState>;
    }

    return <EmptyState icon={Disc3} title="All your music. One place." description="Choose a music folder in Settings to start your collection.">
        <Button onClick={onSettings}>
            <Settings/>Open Settings</Button>
    </EmptyState>;
}
