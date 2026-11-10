import {PageHeader} from "@/components/page-header";
import {formatBytes} from "@/lib/music";
import {ArrowLeft, ChevronRight, Folder, FolderPlus, RefreshCw, Smartphone, Usb} from "lucide-react";
import {useDevices} from "@/hooks/use-devices";
import {Button} from "@/components/ui/button";
import {EmptyState} from "@/components/empty-state";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {DeviceComparison} from "@/components/devices/device-comparison";
import type {ReactNode} from "react";


interface DevicesPageProps {
    visualizer: ReactNode;
    query: string;
}


export function DevicesPage({ visualizer, query }: DevicesPageProps) {
    const phone = useDevices();
    const folders = phone.files.filter((file) => file.directory).sort((first, second) => first.name.localeCompare(second.name));
    const selectedDevice = phone.devices.find((device) => device.storages.some((storage) => storage.id === phone.storageId));
    const parent = phone.path.slice(0, phone.path.lastIndexOf("/")) || "/";
    const search = query.trim().toLocaleLowerCase();
    const devices = phone.devices.filter((device) => (
        [device.name, ...device.storages.map((storage) => storage.name)].join(" ").toLocaleLowerCase().includes(search)
    ));
    const visibleFolders = folders.filter((folder) => folder.name.toLocaleLowerCase().includes(search));

    return (
        <div className="devices-page flex min-h-0 min-w-0 flex-1 flex-col gap-4">
            <PageHeader
                visualizer={visualizer}
                title="Devices"
                details={<span className="inline-flex items-center gap-2">
                    <Usb className="size-3.5 text-info" aria-hidden="true"/>
                    USB music sync · {phone.devices.length} connected
                </span>}
                actions={<Button
                    variant="outline"
                    disabled={phone.busy || phone.loading}
                    onClick={() => void phone.refresh()}
                >
                    <RefreshCw data-icon="inline-start"/>
                    {phone.loading ? "Looking for devices…" : "Refresh devices"}
                </Button>}
            />
            <div className="device-content grid min-h-0 flex-1 auto-rows-max content-start gap-5 overflow-x-hidden overflow-y-auto pb-3 pr-1">
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
                {search && !devices.length && !selectedDevice && phone.devices.length > 0 && <p className="text-sm text-muted-foreground">No devices match your search.</p>}
                {devices.map((device) => (
                    <Card key={device.id}>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Smartphone className="size-6 text-muted-foreground"/>
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
                                {visibleFolders.map((folder) => (
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
                            {search && !visibleFolders.length && <p className="text-xs text-muted-foreground">No folders match your search.</p>}
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
        </div>
    );
}
