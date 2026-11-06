import {Download, LoaderCircle, RefreshCw, RotateCw} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Alert, AlertDescription} from "@/components/ui/alert";
import type {AppUpdateController} from "@/types/updates";

interface UpdateControlsProps {
    updates: AppUpdateController;
    showCheck?: boolean;
}


export function UpdateControls({ updates, showCheck = false }: UpdateControlsProps) {
    const {state, pending} = updates;
    const checking = state?.status === "checking";
    const downloading = state?.status === "downloading";
    const downloaded = state?.status === "downloaded";
    const canDownload = Boolean(state?.availableVersion) && !downloaded && !downloading && !checking;
    const error = updates.error || state?.error;
    const progress = Math.round(Math.max(0, Math.min(100, state?.progress ?? 0)));

    return (
        <div className="flex flex-col gap-4">
            {downloading && (
                <div className="flex flex-col gap-2">
                    <p role="status" className="text-sm text-muted-foreground">Downloading update… {progress}%</p>
                    <progress
                        aria-label="Update download progress"
                        className="h-2 w-full [accent-color:var(--primary)]"
                        max={100}
                        value={progress}
                    />
                </div>
            )}
            {state?.status === "up-to-date" && (
                <p role="status" className="text-sm text-muted-foreground">BTunes is up to date.</p>
            )}
            {downloaded && (
                <p role="status" className="text-sm text-muted-foreground">Update downloaded. Restart BTunes to install it.</p>
            )}
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <div className="flex flex-wrap items-center gap-3">
                {showCheck && (
                    <Button
                        variant="outline"
                        disabled={!state?.enabled || pending || checking || downloading || downloaded}
                        onClick={() => void updates.check()}
                    >
                        {checking ? <LoaderCircle data-icon="inline-start" className="animate-spin"/> : <RefreshCw data-icon="inline-start"/>}
                        {checking ? "Checking…" : "Check for updates"}
                    </Button>
                )}
                {canDownload && (
                    <Button
                        disabled={!state?.enabled || pending}
                        onClick={() => void updates.download()}
                    >
                        <Download data-icon="inline-start"/>
                        Download update
                    </Button>
                )}
                {downloaded && (
                    <Button
                        disabled={!state?.enabled || pending}
                        onClick={() => void updates.install()}
                    >
                        <RotateCw data-icon="inline-start"/>
                        Restart and install
                    </Button>
                )}
            </div>
        </div>
    );
}
