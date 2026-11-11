import type {RefObject} from "react";
import {Badge} from "@/components/ui/badge";
import type {SettingsTab} from "@/types/settings";
import type {Appearance} from "@/types/appearance";
import type {SidebarLayout} from "@/types/sidebar";
import {PageHeader} from "@/components/page-header";
import type {AppUpdateController} from "@/types/updates";
import {FolderOpen, SlidersHorizontal} from "lucide-react";
import type {Playlist} from "../../../shared/types/library";
import {AppUpdates} from "@/components/settings/app-updates";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {LibrarySettings} from "@/components/settings/library-settings";
import {SidebarOrderSettings} from "@/components/sidebar-order-settings";
import {DownloadSettings} from "@/components/downloads/download-settings";
import {AppearanceSettings} from "@/components/settings/appearance-settings";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";


interface SettingsPageProps {
    busy: boolean;
    error: string;
    notice: string;
    playing: boolean;
    tab: SettingsTab;
    folders: string[];
    songCount: number;
    onImport: () => void;
    onRefresh: () => void;
    playlists: Playlist[];
    appearance: Appearance;
    updates: AppUpdateController;
    sidebarLayout: SidebarLayout;
    onTabChange: (tab: SettingsTab) => void;
    analyser: RefObject<AnalyserNode | null>;
    onAppearanceChange: (appearance: Appearance) => void;
}


export function SettingsPage({ appearance, analyser, playing, onAppearanceChange, updates, tab, onTabChange, folders, busy, songCount, notice, error, onImport, onRefresh, sidebarLayout, playlists }: SettingsPageProps) {
    return (
        <div className="settings-page min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
                <PageHeader
                    title="Settings"
                    icon={SlidersHorizontal}
                    eyebrow="Make BTunes yours"
                    details="Library, downloads, navigation, and app updates."
                    actions={
                        <Badge variant="outline">
                            <FolderOpen data-icon="inline-start"/>
                            {songCount.toLocaleString("en")}
                            {" "}
                            songs ·
                            {" "}
                            {folders.length}
                            {" "}
                            {folders.length === 1 ? "folder" : "folders"}
                        </Badge>
                    }
                />
                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            {error}
                        </AlertDescription>
                    </Alert>
                )}
                {notice && (
                    <p
                        role="status"
                        className="text-xs text-muted-foreground"
                    >
                        {notice}
                    </p>
                )}
                <Tabs
                    value={tab}
                    className="gap-6"
                    onValueChange={(value) => {
                        if (value === "library" || value === "downloads" || value === "appearance" || value === "sidebar" || value === "about") onTabChange(value);
                    }}
                >
                    <TabsList
                        variant="line"
                        className="mb-1 gap-4"
                        aria-label="Settings sections"
                    >
                        <TabsTrigger value="library">
                            Library
                        </TabsTrigger>
                        <TabsTrigger value="downloads">
                            Downloads
                        </TabsTrigger>
                        <TabsTrigger value="appearance">
                            Appearance
                        </TabsTrigger>
                        <TabsTrigger value="sidebar">
                            Sidebar
                        </TabsTrigger>
                        <TabsTrigger value="about">
                            About
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent
                        keepMounted
                        value="library"
                    >
                        <LibrarySettings
                            busy={busy}
                            folders={folders}
                            onImport={onImport}
                            songCount={songCount}
                            onRefresh={onRefresh}
                        />
                    </TabsContent>
                    <TabsContent
                        keepMounted
                        value="downloads"
                    >
                        <DownloadSettings musicFolders={folders}/>
                    </TabsContent>
                    <TabsContent value="appearance">
                        <AppearanceSettings
                            playing={playing}
                            analyser={analyser}
                            appearance={appearance}
                            onChange={onAppearanceChange}
                        />
                    </TabsContent>
                    <TabsContent
                        keepMounted
                        value="sidebar"
                    >
                        <SidebarOrderSettings
                            playlists={playlists}
                            layout={sidebarLayout}
                        />
                    </TabsContent>
                    <TabsContent
                        keepMounted
                        value="about"
                    >
                        <AppUpdates updates={updates}/>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
