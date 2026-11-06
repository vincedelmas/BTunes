import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import type {SidebarLayout} from "@/types/sidebar";
import {Folder, FolderPlus, RefreshCw} from "lucide-react";
import type {Playlist} from "../../../shared/types/library";
import {SidebarOrderSettings} from "@/components/sidebar-order-settings";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";


interface SettingsPageProps {
    busy: boolean;
    error: string;
    notice: string;
    folders: string[];
    songCount: number;
    onImport: () => void;
    onRefresh: () => void;
    playlists: Playlist[];
    sidebarLayout: SidebarLayout;
}


export function SettingsPage({ folders, busy, songCount, notice, error, onImport, onRefresh, sidebarLayout, playlists }: SettingsPageProps) {
    return (
        <div className="settings-page overflow-auto min-h-0 flex-1 pt-4 px-6 pb-8">
            <div
                className="settings-heading mb-8 max-w-220"
            >
                <p className="eyebrow m-0 text-[10px] font-bold tracking-[2px] text-primary">
                    BTUNES
                </p>
                <h1 className="mt-2 mb-3 text-[34px] font-[750] tracking-[-1.5px]">Settings</h1>
                <p className="muted text-muted-foreground">
                    A home for your music. Set it up your way.
                </p>
            </div>
            {notice &&
                <p
                    role="status"
                    className="notice text-primary text-xs mb-5 [overflow-wrap:anywhere] shrink-0 max-h-16 overflow-auto"
                >
                    {notice}
                </p>
            }
            {error &&
                <p
                    role="alert"
                    className="text-destructive"
                >
                    {error}
                </p>
            }
            <Card className="settings-card max-w-220 mb-5 bg-[#191919] border border-[#ffffff0c] rounded-[14px]">
                <CardHeader>
                    <div className="settings-section-title flex items-center justify-between gap-5">
                        <CardTitle>
                            Music folders
                        </CardTitle>
                        <Badge variant="secondary">
                            {folders.length} configured
                        </Badge>
                    </div>
                    <CardDescription>
                        BTunes watches these folders for new songs and changes while the app is open.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {folders.length ?
                        <ul
                            className="folder-list flex flex-col gap-[10px]"
                        >
                            {folders.map((folder) =>
                                <li
                                    key={folder}
                                    className="flex items-center gap-[14px] rounded-[10px] border border-[#ffffff09] bg-[#ffffff04] p-4"
                                >
                                    <div
                                        className="folder-icon grid place-items-center size-[42px] text-primary bg-[#1ed7600c]
                                        rounded-[9px] shrink-0 [&_svg]:w-5"
                                    >
                                        <Folder/>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <strong className="mb-[5px] block text-[13px]">{folder.split("/").filter(Boolean).at(-1) ?? folder}</strong>
                                        <span className="block text-[11px] text-muted-foreground [overflow-wrap:anywhere]">{folder}</span>
                                    </div>
                                    <Badge variant="outline">
                                        Watching
                                    </Badge>
                                </li>
                            )}
                        </ul>
                        :
                        <div
                            className="settings-no-folders flex items-center gap-[14px] p-4 bg-[#ffffff04] border
                            border-[#ffffff09] rounded-[10px]"
                        >
                            <Folder/>
                            <p>No folders yet. Add one to start your collection.</p>
                        </div>
                    }
                </CardContent>
                <CardFooter>
                    <Button
                        disabled={busy}
                        onClick={onImport}
                    >
                        <FolderPlus/>
                        {busy ? "Indexing…" : "Add music folder"}
                    </Button>
                </CardFooter>
            </Card>
            <Card className="settings-card max-w-220 mb-5 bg-[#191919] border border-[#ffffff0c] rounded-[14px]">
                <CardHeader>
                    <CardTitle>
                        Library
                    </CardTitle>
                    <CardDescription>
                        Updated automatically. Refresh it here whenever you need to.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div
                        className="library-stat flex items-baseline gap-3"
                    >
                        <strong className="text-[32px] font-bold tracking-[-1px]">{songCount.toLocaleString("en")}</strong>
                        <span className="text-xs text-muted-foreground">songs</span>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        variant="outline"
                        aria-label="Refresh library"
                        onClick={onRefresh}
                    >
                        <RefreshCw data-icon="inline-start"/>
                        Refresh library
                    </Button>
                </CardFooter>
            </Card>
            <SidebarOrderSettings
                playlists={playlists}
                layout={sidebarLayout}
            />
        </div>
    );
}
