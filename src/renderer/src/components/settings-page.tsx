import type {Playlist} from "../../../shared/types/library";
import type {SidebarLayout} from "@/types/sidebar";
import type {SettingsTab} from "@/types/settings";
import {DownloadSettings} from "@/components/downloads/download-settings";
import {LibrarySettings} from "@/components/settings/library-settings";
import {SidebarOrderSettings} from "@/components/sidebar-order-settings";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";

interface SettingsPageProps {
    tab: SettingsTab;
    onTabChange: (tab: SettingsTab) => void;
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


export function SettingsPage({ tab, onTabChange, folders, busy, songCount, notice, error, onImport, onRefresh, sidebarLayout, playlists }: SettingsPageProps) {
    return (
        <div className="settings-page min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-7 lg:px-9">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-7">
                <header className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-sm text-muted-foreground">Your library, your workflow.</p>
                </header>
                {error && <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>}
                {notice && <p
                    role="status"
                    className="text-xs text-muted-foreground"
                >{notice}</p>}
                <Tabs
                    value={tab}
                    onValueChange={(value) => {
                        if (value === "library" || value === "downloads" || value === "sidebar") onTabChange(value);
                    }}
                    className="gap-6"
                >
                    <TabsList
                        variant="line"
                        aria-label="Settings sections"
                        className="mb-1 gap-4"
                    >
                        <TabsTrigger value="library">Library</TabsTrigger>
                        <TabsTrigger value="downloads">Downloads</TabsTrigger>
                        <TabsTrigger value="sidebar">Sidebar</TabsTrigger>
                    </TabsList>
                    <TabsContent
                        value="library"
                        keepMounted
                    >
                        <LibrarySettings
                            folders={folders}
                            busy={busy}
                            songCount={songCount}
                            onImport={onImport}
                            onRefresh={onRefresh}
                        />
                    </TabsContent>
                    <TabsContent
                        value="downloads"
                        keepMounted
                    >
                        <DownloadSettings musicFolders={folders}/>
                    </TabsContent>
                    <TabsContent
                        value="sidebar"
                        keepMounted
                    >
                        <SidebarOrderSettings
                            playlists={playlists}
                            layout={sidebarLayout}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
