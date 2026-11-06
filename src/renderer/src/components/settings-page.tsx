import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Folder, FolderPlus, RefreshCw} from "lucide-react";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";


interface SettingsPageProps {
    busy: boolean;
    error: string;
    notice: string;
    folders: string[];
    songCount: number;
    onImport: () => void;
    onRefresh: () => void;
}


export function SettingsPage({ folders, busy, songCount, notice, error, onImport, onRefresh }: SettingsPageProps) {
    return (
        <div className="settings-page">
            <div className="settings-heading">
                <p className="eyebrow">
                    BTUNES
                </p>
                <h1>Settings</h1>
                <p className="muted">
                    A home for your music. Set it up your way.
                </p>
            </div>

            {notice &&
                <p role="status" className="notice">
                    {notice}
                </p>
            }

            {error &&
                <p role="alert" className="text-destructive">
                    {error}
                </p>
            }

            <Card className="settings-card">
                <CardHeader>
                    <div className="settings-section-title">
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
                        <ul className="folder-list">
                            {folders.map((folder) =>
                                <li key={folder}>
                                    <div className="folder-icon">
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
                        <div className="settings-no-folders">
                            <Folder/>
                            <p>No folders yet. Add one to start your collection.</p>
                        </div>
                    }
                </CardContent>
                <CardFooter>
                    <Button disabled={busy} onClick={onImport}>
                        <FolderPlus/>
                        {busy
                            ? "Indexing…"
                            : "Add music folder"
                        }
                    </Button>
                </CardFooter>
            </Card>
            <Card className="settings-card">
                <CardHeader>
                    <CardTitle>
                        Library
                    </CardTitle>
                    <CardDescription>
                        Your index updates automatically. Refresh it here whenever you need to.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="library-stat">
                        <strong>{songCount.toLocaleString("en")}</strong>
                        <span>indexed songs</span>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" aria-label="Refresh library" onClick={onRefresh}>
                        <RefreshCw/>Refresh library
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
