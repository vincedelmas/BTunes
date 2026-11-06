import {SettingsSection} from "@/components/settings/settings-section";
import {UpdateControls} from "@/components/update-controls";
import type {AppUpdateController} from "@/types/updates";

interface AppUpdatesProps {
    updates: AppUpdateController;
}


export function AppUpdates({ updates }: AppUpdatesProps) {
    const {state} = updates;

    return (
        <SettingsSection title="BTunes" description="Local music library manager and player.">
            <div className="flex flex-col gap-5">
                <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Installed version</dt>
                    <dd className="font-medium tabular-nums">{state?.version ?? "Loading…"}</dd>
                    {state?.availableVersion && (
                        <>
                            <dt className="text-muted-foreground">Available version</dt>
                            <dd className="font-medium tabular-nums">{state.availableVersion}</dd>
                        </>
                    )}
                    {state?.lastCheckedAt && (
                        <>
                            <dt className="text-muted-foreground">Last checked</dt>
                            <dd>{new Date(state.lastCheckedAt).toLocaleString()}</dd>
                        </>
                    )}
                </dl>
                {state?.enabled && (
                    <p className="text-sm text-muted-foreground">Updates are checked automatically once a day. Downloads and installation require your confirmation.</p>
                )}
                {state && !state.enabled && (
                    <p className="text-sm text-muted-foreground">App updates are available in the Linux AppImage release.</p>
                )}
                <UpdateControls updates={updates} showCheck/>
            </div>
        </SettingsSection>
    );
}
