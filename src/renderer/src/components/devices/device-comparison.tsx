import {formatBytes} from "@/lib/music";
import {ArrowDownToLine, Check, Square} from "lucide-react";
import type {DeviceSyncState} from "../../../../shared/types/devices";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";

interface DeviceComparisonProps {
    state: DeviceSyncState;
    canSync: boolean;
    onSync: () => void;
    onCancel: () => void;
}


export function DeviceComparison({ state, canSync, onSync, onCancel }: DeviceComparisonProps) {
    const comparison = state.comparison;
    const busy = state.phase === "comparing" || state.phase === "syncing";
    const syncing = state.phase === "syncing";
    if (state.phase === "idle") return null;

    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle>{state.phase === "complete" ? "Your music is on your phone" : "Sync to phone"}</CardTitle>
                <CardDescription>{state.folder || "Compare your library with a phone folder."}</CardDescription>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-5">
                {busy && (
                    <div
                        role="status"
                        className="flex min-w-0 flex-col gap-2 text-sm"
                    >
                        <p>{syncing ? "Copying " + state.completed + " of " + state.total + " songs" : "Checking phone · " + state.completed + " songs found"}</p>
                        <p className="truncate text-xs text-muted-foreground">{state.current}</p>
                        <progress
                            className="h-1.5 w-full accent-primary"
                            aria-label={syncing ? "Copy progress" : "Phone scan progress"}
                            max={state.total || 1}
                            value={syncing ? state.completed : undefined}
                        />
                    </div>
                )}
                {comparison && (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {[
                            [comparison.missing, "Missing on phone"],
                            [comparison.present, "Already there"],
                            [comparison.different, "Different versions"],
                            [comparison.phoneOnly, "Only on phone"],
                        ].map(([count, label]) => (
                            <div
                                key={label}
                                className="rounded-lg bg-secondary/40 p-4"
                            >
                                <strong className="block text-2xl font-semibold tabular-nums">{count}</strong>
                                <span className="mt-1 block text-xs text-muted-foreground">{label}</span>
                            </div>
                        ))}
                    </div>
                )}
                {state.phase === "ready" && comparison?.preview.length ? (
                    <div>
                        <p className="mb-3 text-xs font-semibold text-muted-foreground">Ready to copy · {formatBytes(comparison.bytes)}</p>
                        <ul className="flex flex-col gap-2 text-sm">
                            {comparison.preview.map((track, index) => (
                                <li
                                    key={index}
                                    className="flex min-w-0 items-baseline justify-between gap-4"
                                >
                                    <span className="truncate">{track.title}</span>
                                    <span className="truncate text-xs text-muted-foreground">{track.artist}</span>
                                </li>
                            ))}
                        </ul>
                        {comparison.missing > comparison.preview.length &&
                            <p className="mt-3 text-xs text-muted-foreground">And {comparison.missing - comparison.preview.length} more songs.</p>}
                    </div>
                ) : null}
                {state.phase === "complete" &&
                    <p
                        role="status"
                        className="flex items-center gap-2 text-sm text-primary"
                    ><Check className="size-4"/>{state.completed} songs copied.</p>}
                {state.phase === "cancelled" && <p
                    role="status"
                    className="text-sm text-muted-foreground"
                >Stopped. Compare again to continue.</p>}
                {state.errors.map((error, index) => <p
                    role="alert"
                    key={index}
                    className="text-sm text-destructive"
                >{error}</p>)}
            </CardContent>
            {(busy || state.phase === "ready") && (
                <CardFooter>
                    {busy ? (
                        <Button
                            variant="outline"
                            onClick={onCancel}
                        >
                            <Square data-icon="inline-start"/>
                            {syncing ? "Stop after this song" : "Stop comparison"}
                        </Button>
                    ) : (
                        <Button
                            onClick={onSync}
                            disabled={!comparison?.missing || !canSync}
                        >
                            <ArrowDownToLine data-icon="inline-start"/>
                            Copy missing songs
                        </Button>
                    )}
                </CardFooter>
            )}
        </Card>
    );
}
