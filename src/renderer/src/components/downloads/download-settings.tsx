import {compileBookmarkPattern} from "../../../../shared/bookmarks";
import {useEffect, useState} from "react";
import {FolderOpen, Import, Save} from "lucide-react";
import {rpc} from "@/lib/rpc";
import {getErrorMessage} from "../../../../shared/errors";
import {downloaderSettingsSchema} from "../../../../shared/schemas/downloads";
import type {BookmarkFolder, DownloaderSettings} from "../../../../shared/types/downloads";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Field, FieldGroup, FieldLabel, FieldDescription} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {FilterSelect} from "@/components/filter-select";
import {Alert, AlertDescription} from "@/components/ui/alert";

interface DownloadSettingsProps {
    musicFolders: string[]
}


export function DownloadSettings({ musicFolders }: DownloadSettingsProps) {
    const [settings, setSettings] = useState<DownloaderSettings>();
    const [folders, setFolders] = useState<BookmarkFolder[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [example, setExample] = useState("Daft Punk - One More Time");
    let preview = "Check the pattern and example.";
    try {
        const fields = compileBookmarkPattern(settings?.namePattern ?? "{artist} - {title}").exec(example)?.groups;
        if (fields) preview = "Artist: " + fields.artist + " · Title: " + fields.title;
    }
    catch { /* Invalid drafts remain editable until saved. */
    }

    useEffect(() => {
        let active = true;
        void rpc("downloads.settings.get", undefined).then(async (settings) => {
            if (!active) return;
            setSettings(settings);
            if (settings.bookmarksFile) {
                const folders = await rpc("downloads.bookmarks.folders", { path: settings.bookmarksFile });
                if (active) setFolders(folders);
            }
        }).catch((error: unknown) => {
            if (active) setError(getErrorMessage(error));
        });
        return () => {
            active = false;
        };
    }, []);

    async function chooseBookmarks() {
        setBusy(true);
        setError("");
        try {
            const path = await rpc("downloads.bookmarks.choose", undefined);
            if (!path || !settings) return;
            const folders = await rpc("downloads.bookmarks.folders", { path });
            setSettings({ ...settings, bookmarksFile: path, folderId: "" });
            setFolders(folders);
        }
        catch (error) {
            setError(getErrorMessage(error));
        }
        finally {
            setBusy(false);
        }
    }

    async function importSettings() {
        setBusy(true);
        setError("");
        try {
            const settings = await rpc("downloads.settings.import", undefined);
            if (!settings) return;
            setSettings(settings);
            setFolders(await rpc("downloads.bookmarks.folders", { path: settings.bookmarksFile }));
            setNotice("Music Downloader settings imported.");
        }
        catch (error) {
            setError(getErrorMessage(error));
        }
        finally {
            setBusy(false);
        }
    }

    async function save() {
        if (!settings) return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            setSettings(await rpc("downloads.settings.save", downloaderSettingsSchema.parse(settings)));
            setNotice("Download settings saved.");
        }
        catch (error) {
            setError(getErrorMessage(error));
        }
        finally {
            setBusy(false);
        }
    }

    return (
        <Card className="mb-5 max-w-220">
            <CardHeader>
                <CardTitle>Downloads</CardTitle>
                <CardDescription>Turn your YouTube bookmarks into music, with tags and embedded artwork prepared before adding it to your library.</CardDescription>
            </CardHeader>
            <CardContent>
                {settings && <FieldGroup className="gap-5">
                    <Field>
                        <FieldLabel>Browser Bookmarks file</FieldLabel>
                        <div className="flex items-center gap-3">
                            <Input
                                aria-label="Browser Bookmarks file"
                                readOnly
                                value={settings.bookmarksFile}
                                placeholder="Choose Chrome or Brave’s Bookmarks file"
                            />
                            <Button
                                variant="outline"
                                disabled={busy}
                                onClick={() => void chooseBookmarks()}
                            >
                                <FolderOpen data-icon="inline-start"/>
                                Browse
                            </Button>
                        </div>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="download-bookmark-folder">Bookmark folder</FieldLabel>
                        <FilterSelect
                            id="download-bookmark-folder"
                            label="Bookmark folder"
                            className="w-full max-w-none"
                            disabled={busy}
                            value={settings.folderId}
                            placeholder="Choose a folder"
                            options={folders.map((folder) => ({ value: folder.id, label: folder.label }))}
                            onChange={(folderId) => setSettings({ ...settings, folderId })}
                        />
                        <FieldDescription>Nested folders are included automatically.</FieldDescription>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="download-destination">Music folder</FieldLabel>
                        <FilterSelect
                            id="download-destination"
                            label="Download music folder"
                            className="w-full max-w-none"
                            disabled={busy}
                            value={settings.destination}
                            placeholder="Add a music folder above first"
                            options={musicFolders.map((folder) => ({ value: folder, label: folder }))}
                            onChange={(destination) => setSettings({ ...settings, destination })}
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="download-pattern">Bookmark name pattern</FieldLabel>
                        <Input
                            id="download-pattern"
                            disabled={busy}
                            value={settings.namePattern}
                            onChange={(ev) => setSettings({ ...settings, namePattern: ev.target.value })}
                        />
                        <FieldDescription>For “Daft Punk - One More Time”, use {'{artist} - {title}'}. Use {'{skip}'} for an ignored section.</FieldDescription>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="download-example">Pattern preview</FieldLabel>
                        <Input
                            id="download-example"
                            value={example}
                            onChange={(ev) => setExample(ev.target.value)}
                        />
                        <FieldDescription>{preview}</FieldDescription>
                    </Field>
                    <div className="grid grid-cols-2 gap-5">
                        <Field>
                            <FieldLabel htmlFor="download-quality">MP3 quality</FieldLabel>
                            <FilterSelect
                                id="download-quality"
                                label="MP3 quality"
                                className="w-full max-w-none"
                                disabled={busy}
                                value={settings.quality}
                                placeholder="192k"
                                options={["128k", "192k", "256k", "320k"].map((quality) => ({ value: quality, label: quality }))}
                                onChange={(quality) => setSettings({ ...settings, quality: downloaderSettingsSchema.shape.quality.parse(quality) })}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="download-concurrency">Simultaneous downloads</FieldLabel>
                            <Input
                                id="download-concurrency"
                                disabled={busy}
                                type="number"
                                min={1}
                                max={10}
                                value={settings.concurrency}
                                onChange={(ev) => setSettings({ ...settings, concurrency: Number(ev.target.value) })}
                            />
                        </Field>
                    </div>
                    <Field orientation="horizontal">
                        <Checkbox
                            id="download-metadata"
                            disabled={busy}
                            checked={settings.fetchMetadata}
                            onCheckedChange={(value) => setSettings({ ...settings, fetchMetadata: Boolean(value) })}
                        />
                        <FieldLabel htmlFor="download-metadata">Look up tags and artwork online after downloading</FieldLabel>
                    </Field>
                </FieldGroup>}
                {error && <Alert
                    variant="destructive"
                    className="mt-4"
                >
                    <AlertDescription>{error}</AlertDescription>
                </Alert>}
                {notice && <p
                    role="status"
                    className="mt-4 text-sm text-primary"
                >{notice}</p>}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-3">
                <Button
                    disabled={busy || !settings}
                    onClick={() => void save()}
                >
                    <Save data-icon="inline-start"/>
                    {busy ? "Working…" : "Save download settings"}
                </Button>
                <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void importSettings()}
                >
                    <Import data-icon="inline-start"/>
                    Import Go app settings
                </Button>
            </CardFooter>
        </Card>
    );
}
