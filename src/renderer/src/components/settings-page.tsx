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
                className="settings-heading max-w-220 mb-8 [&_.eyebrow]:text-primary [&_.eyebrow]:text-[10px] [&_.eyebrow]:tracking-[2px] [&_h1]:text-[34px] [&_h1]:font-[750] [&_h1]:tracking-[-1.5px] [&_h1]:mt-2 [&_h1]:mx-0 [&_h1]:mb-3">
                <p className="eyebrow text-xs font-bold m-0">
                    BTUNES
                </p>
                <h1>Settings</h1>
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
                        <ul className="folder-list flex flex-col gap-[10px] [&_li]:flex [&_li]:items-center [&_li]:gap-[14px] [&_li]:p-4 [&_li]:bg-[#ffffff04] [&_li]:border [&_li]:border-[#ffffff09] [&_li]:rounded-[10px] [&_li_>_div:nth-child(2)]:flex-1 [&_li_>_div:nth-child(2)]:min-w-0 [&_strong]:block [&_strong]:text-[13px] [&_strong]:mb-[5px] [&_span]:block [&_span]:text-muted-foreground [&_span]:text-[11px] [&_span]:[overflow-wrap:anywhere]">
                            {folders.map((folder) =>
                                <li key={folder}>
                                    <div className="folder-icon grid place-items-center w-[42px] h-[42px] text-primary bg-[#1ed7600c] rounded-[9px] shrink-0 [&_svg]:w-5">
                                        <Folder/>
                                    </div>
                                    <div>
                                        <strong>
                                            {folder.split("/").filter(Boolean).at(-1) ?? folder}
                                        </strong>
                                        <span>{folder}</span>
                                    </div>
                                    <Badge variant="outline">
                                        Watching
                                    </Badge>
                                </li>
                            )}
                        </ul>
                        :
                        <div className="settings-no-folders flex items-center gap-[14px] p-4 bg-[#ffffff04] border
                        border-[#ffffff09] rounded-[10px]">
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
                        className="library-stat flex items-baseline gap-3 [&_strong]:text-[32px] [&_strong]:tracking-[-1px]
                        [&_strong]:font-bold [&_span]:text-muted-foreground [&_span]:text-xs"
                    >
                        <strong>{songCount.toLocaleString("en")}</strong>
                        <span>songs</span>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        variant="outline"
                        aria-label="Refresh library"
                        onClick={onRefresh}
                    >
                        <RefreshCw/>Refresh library
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
