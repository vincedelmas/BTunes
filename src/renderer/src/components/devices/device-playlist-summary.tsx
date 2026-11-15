import {Badge} from "@/components/ui/badge";
import type {DeviceSyncState} from "../../../../shared/types/devices";


interface DevicePlaylistSummaryProps {
    state: DeviceSyncState;
}


export function DevicePlaylistSummary({ state }: DevicePlaylistSummaryProps) {
    const files = state.playlistFiles ?? [];

    return (
        <section aria-label="Playlist export summary" className="flex min-w-0 flex-col gap-3">
            <h3 className="text-sm font-medium">
                Playlist files
            </h3>
            {!files.length && (
                <p className="text-sm text-muted-foreground">
                    No playlists selected. This transfer copies missing music only.
                </p>
            )}
            {files.length > 0 && (
                <>
                    <ul className="flex flex-col gap-3">
                        {files.map((file, index) => (
                            <li key={file.filename} className="flex min-w-0 items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                        {file.name}
                                    </p>
                                    <p className="break-words text-xs text-muted-foreground">
                                        {file.filename}
                                    </p>
                                </div>
                                <Badge variant="outline">
                                    {index < (state.playlistsCompleted ?? 0) ? "Exported" : "Selected"}
                                </Badge>
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">
                        Playlist files reference your phone’s songs without duplicating audio.
                        In Pulsar, rescan or import them if needed. Names edited in Pulsar do not change BTunes.
                    </p>
                </>
            )}
        </section>
    );
}
