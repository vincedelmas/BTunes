import {PageHeader} from "@/components/page-header";
import {Badge} from "@/components/ui/badge";
import {FolderOpen, SlidersHorizontal} from "lucide-react";
import type {RefObject} from "react";
import type {Appearance} from "@/types/appearance";
import {AppearanceSettings} from "@/components/settings/appearance-settings";
import type {Playlist} from "../../../shared/types/library";
import type {SidebarLayout} from "@/types/sidebar";
import {AppUpdates} from "@/components/settings/app-updates";
import type {AppUpdateController} from "@/types/updates";
import type {SettingsTab} from "@/types/settings";
import {DownloadSettings} from "@/components/downloads/download-settings";
import {LibrarySettings} from "@/components/settings/library-settings";
import {SidebarOrderSettings} from "@/components/sidebar-order-settings";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";

interface SettingsPageProps {
    appearance: Appearance;
    analyser: RefObject<AnalyserNode | null>;
    playing: boolean;
    onAppearanceChange: (appearance: Appearance) => void;
    tab: SettingsTab;
    updates: AppUpdateController;
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


export function SettingsPage({ appearance, analyser, playing, onAppearanceChange, updates, tab, onTabChange, folders, busy, songCount, notice, error, onImport, onRefresh, sidebarLayout, playlists }: SettingsPageProps) {
    return (
        <div className="settings-page min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
                <PageHeader
                    title="Settings"
                    eyebrow="Make BTunes yours"
                    icon={SlidersHorizontal}
                    details="Library, downloads, navigation, and app updates."
                    actions={<Badge variant="outline">
                        <FolderOpen data-icon="inline-start"/>
                        {songCount.toLocaleString("en")} songs · {folders.length} {folders.length === 1 ? "folder" : "folders"}
                    </Badge>}
                />
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
                        if (value === "library" || value === "downloads" || value === "appearance" || value === "sidebar" || value === "about") onTabChange(value);
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
                        <TabsTrigger value="appearance">Appearance</TabsTrigger>
                        <TabsTrigger value="sidebar">Sidebar</TabsTrigger>
                        <TabsTrigger value="about">About</TabsTrigger>
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
                        value="appearance"
                    >
                        <AppearanceSettings
                            appearance={appearance}
                            analyser={analyser}
                            playing={playing}
                            onChange={onAppearanceChange}
                        />
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
                    <TabsContent value="about" keepMounted>
                        <AppUpdates updates={updates}/>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
