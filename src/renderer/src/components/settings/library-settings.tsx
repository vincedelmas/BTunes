import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {EmptyState} from "@/components/empty-state";
import {Folder, FolderPlus, RefreshCw} from "lucide-react";
import {SettingsSection} from "@/components/settings/settings-section";


interface LibrarySettingsProps {
    busy: boolean;
    folders: string[];
    songCount: number;
    onImport: () => void;
    onRefresh: () => void;
}


export function LibrarySettings({ folders, busy, songCount, onImport, onRefresh }: LibrarySettingsProps) {
    return (
        <div className="flex flex-col gap-6">
            <SettingsSection
                title="Music folders"
                description="New songs and file changes are indexed automatically."
                action={
                    <Button
                        disabled={busy}
                        variant="outline"
                        onClick={onImport}
                    >
                        <FolderPlus data-icon="inline-start"/>
                        {busy ? "Indexing…" : "Add music folder"}
                    </Button>
                }
            >
                {folders.length ? (
                    <ul className="folder-list flex flex-col divide-y divide-border/60">
                        {folders.map((folder) => (
                            <li
                                key={folder}
                                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                            >
                                <div
                                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground"
                                >
                                    <Folder className="size-5"/>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium">
                                        {folder.split("/").filter(Boolean).at(-1) || folder}
                                    </p>
                                    <p
                                        title={folder}
                                        className="mt-1 truncate text-xs text-muted-foreground"
                                    >
                                        {folder}
                                    </p>
                                </div>
                                <Badge variant="outline">
                                    Watching
                                </Badge>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState
                        icon={Folder}
                        title="No music folders"
                        description="Add a folder to index its audio files."
                    />
                )}
            </SettingsSection>
            <SettingsSection
                title="Library scan"
                description="Check for changes made while BTunes was closed."
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="library-stat text-muted-foreground">
                        <strong className="mr-2 text-2xl font-semibold tracking-tight text-foreground">
                            {songCount.toLocaleString("en")}
                        </strong>
                        {songCount === 1 ? "song indexed" : "songs indexed"}
                    </p>
                    <Button
                        disabled={busy}
                        variant="outline"
                        onClick={onRefresh}
                        aria-label="Refresh library"
                    >
                        <RefreshCw data-icon="inline-start"/>
                        Refresh library
                    </Button>
                </div>
            </SettingsSection>
        </div>
    );
}
