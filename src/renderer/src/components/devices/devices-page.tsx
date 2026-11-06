import {formatBytes} from "@/lib/music";
import {ArrowLeft, ChevronRight, Folder, FolderPlus, RefreshCw, Smartphone, Usb} from "lucide-react";
import {useDevices} from "@/hooks/use-devices";
import {Button} from "@/components/ui/button";
import {EmptyState} from "@/components/empty-state";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {DeviceComparison} from "@/components/devices/device-comparison";

export function DevicesPage() {
    const phone = useDevices();
    const folders = phone.files.filter((file) => file.directory).sort((first, second) => first.name.localeCompare(second.name));
    const selectedDevice = phone.devices.find((device) => device.storages.some((storage) => storage.id === phone.storageId));
    const parent = phone.path.slice(0, phone.path.lastIndexOf("/")) || "/";

    return (
        <div className="devices-page flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-3 pr-1">
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">Your PC library, on your phone.</p>
                <Button
                    variant="outline"
                    disabled={phone.busy || phone.loading}
                    onClick={() => void phone.refresh()}
                >
                    <RefreshCw data-icon="inline-start"/>
                    {phone.loading ? "Looking for devices…" : "Refresh devices"}
                </Button>
            </div>
            {phone.error && <Alert variant="destructive">
                <AlertDescription>{phone.error}</AlertDescription>
            </Alert>}
            {!phone.devices.length && !phone.loading && (
                <EmptyState
                    icon={Usb}
                    title="Connect your phone by USB"
                    description="Unlock your phone and choose File Transfer in its USB settings. It will appear here when connected."
                />
            )}
            {phone.devices.map((device) => (
                <Card key={device.id}>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Smartphone className="size-7 text-primary"/>
                            <div>
                                <CardTitle>{device.name}</CardTitle>
                                <CardDescription className="mt-1">Connected over USB</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!device.storages.length ? (
                            <p className="text-sm text-muted-foreground">Storage is unavailable. Unlock the phone and reconnect its cable with File Transfer enabled.</p>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {device.storages.map((storage) => (
                                    <Button
                                        key={storage.id}
                                        variant={storage.id === phone.storageId ? "secondary" : "outline"}
                                        disabled={phone.busy || phone.opening}
                                        onClick={() => void phone.browse("/", storage.id)}
                                    >
                                        <Folder data-icon="inline-start"/>
                                        {storage.name} · {formatBytes(storage.freeBytes)} free
                                    </Button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
            {selectedDevice && (
                <Card>
                    <CardHeader>
                        <CardTitle>Choose the music folder</CardTitle>
                        <CardDescription>Open the folder containing your phone’s music, then compare it with the PC library.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex min-w-0 items-center gap-2">
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label="Parent phone folder"
                                disabled={phone.path === "/" || phone.busy || phone.opening}
                                onClick={() => void phone.browse(parent)}
                            >
                                <ArrowLeft/>
                            </Button>
                            <span className="truncate text-sm">{selectedDevice.name}{phone.path}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                            {folders.map((folder) => (
                                <Button
                                    className="justify-start"
                                    key={folder.path}
                                    variant="ghost"
                                    disabled={phone.busy || phone.opening}
                                    onClick={() => void phone.browse(folder.path)}
                                >
                                    <Folder data-icon="inline-start"/>
                                    <span className="truncate">{folder.name}</span>
                                    <ChevronRight
                                        className="ml-auto"
                                        data-icon="inline-end"
                                    />
                                </Button>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button
                                disabled={phone.path === "/" || phone.busy || phone.opening}
                                onClick={() => void phone.compare()}
                            >Compare with PC</Button>
                            {phone.path === "/" && !folders.some((folder) => folder.name.toLowerCase() === "music") && (
                                <Button
                                    variant="outline"
                                    disabled={phone.busy || phone.opening}
                                    onClick={() => void phone.createMusicFolder()}
                                >
                                    <FolderPlus data-icon="inline-start"/>
                                    Create Music folder
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
            <DeviceComparison
                state={phone.state}
                canSync={phone.state.storageId === phone.storageId && phone.state.folder === phone.path}
                onSync={() => void phone.sync()}
                onCancel={() => void phone.cancel()}
            />
        </div>
    );
}
