import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {Separator} from "@/components/ui/separator";
import {FilterSelect} from "@/components/filter-select";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {useDownloadSettings} from "@/hooks/use-download-settings";
import {Check, FileJson, FolderOpen, Import, Save} from "lucide-react";
import {SettingsSection} from "@/components/settings/settings-section";
import {downloaderSettingsSchema} from "../../../../shared/schemas/downloads";
import {BookmarkPatternFields} from "@/components/downloads/bookmark-pattern-fields";
import {Field, FieldContent, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";


const qualityOptions = ["128k", "192k", "256k", "320k"]
    .map((value) => ({ value, label: value.replace("k", " kbps") }));


interface DownloadSettingsProps {
    musicFolders: string[];
}


export function DownloadSettings({ musicFolders }: DownloadSettingsProps) {
    const form = useDownloadSettings();
    const { settings, folders, busy, dirty, error, notice, change } = form;

    if (!settings) {
        return (
            <p role="status" className="py-6 text-sm text-muted-foreground">
                {error || "Loading download settings…"}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <SettingsSection
                title="Bookmarks"
                description="Select the bookmarks file and folder used for downloads."
                action={
                    <Button variant="ghost" disabled={busy} onClick={() => void form.importSettings()}>
                        <Import data-icon="inline-start"/>
                        Import Go app settings
                    </Button>
                }
            >
                <FieldGroup>
                    <Field>
                        <FieldLabel id="download-bookmarks-label">
                            Browser Bookmarks file
                        </FieldLabel>
                        <div className="flex items-center gap-4 rounded-lg border border-border/60 p-3">
                            <FileJson className="size-5 shrink-0 text-muted-foreground"/>
                            <div className="min-w-0 flex-1" aria-labelledby="download-bookmarks-label">
                                <p className="truncate font-medium">
                                    {settings.bookmarksFile
                                        ? "Bookmarks file selected"
                                        : "Choose a browser file"
                                    }
                                </p>
                                <p title={settings.bookmarksFile} className="mt-1 truncate text-xs text-muted-foreground">
                                    {settings.bookmarksFile || "Chrome or Brave · bookmarks are only read"}
                                </p>
                            </div>
                            <Button disabled={busy} variant="outline" onClick={() => void form.chooseBookmarks()}>
                                <FolderOpen data-icon="inline-start"/>
                                Browse
                            </Button>
                        </div>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="download-bookmark-folder">
                            Bookmark folder
                        </FieldLabel>
                        <FilterSelect
                            label="Bookmark folder"
                            value={settings.folderId}
                            id="download-bookmark-folder"
                            className="w-full max-w-none"
                            placeholder="Choose a folder"
                            disabled={busy || !folders.length}
                            onChange={(folderId) => change({ folderId })}
                            options={folders.map((folder) => ({ value: folder.id, label: folder.label }))}
                        />
                        <FieldDescription>
                            All bookmarks inside nested folders are included.
                        </FieldDescription>
                    </Field>
                    <Separator/>
                    <BookmarkPatternFields
                        disabled={busy}
                        pattern={settings.namePattern}
                        onChange={(namePattern) => change({ namePattern })}
                    />
                </FieldGroup>
            </SettingsSection>
            <SettingsSection title="Audio & library" description="Set the output folder and audio quality.">
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="download-destination">
                            Save to music folder
                        </FieldLabel>
                        <FilterSelect
                            id="download-destination"
                            value={settings.destination}
                            label="Download music folder"
                            className="w-full max-w-none"
                            placeholder="Choose a music folder"
                            disabled={busy || !musicFolders.length}
                            onChange={(destination) => change({ destination })}
                            options={musicFolders.map((folder) => ({ value: folder, label: folder }))}
                        />
                        {!musicFolders.length &&
                            <FieldDescription>
                                Add a music folder in the Library tab first.
                            </FieldDescription>
                        }
                    </Field>
                    <FieldGroup className="grid gap-5 sm:grid-cols-2">
                        <Field>
                            <FieldLabel htmlFor="download-quality">
                                MP3 quality
                            </FieldLabel>
                            <FilterSelect
                                disabled={busy}
                                allowEmpty={false}
                                label="MP3 quality"
                                id="download-quality"
                                value={settings.quality}
                                options={qualityOptions}
                                placeholder="Choose quality"
                                className="w-full max-w-none"
                                onChange={(quality) => change({ quality: downloaderSettingsSchema.shape.quality.parse(quality) })}
                            />
                            <FieldDescription>
                                192 kbps is a good balance of size and quality.
                            </FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="download-concurrency">
                                Simultaneous downloads
                            </FieldLabel>
                            <Input
                                min={1}
                                max={10}
                                type="number"
                                disabled={busy}
                                id="download-concurrency"
                                value={settings.concurrency}
                                onChange={(ev) => change({ concurrency: Number(ev.target.value) })}
                            />
                            <FieldDescription>
                                Between 1 and 10 songs at a time.
                            </FieldDescription>
                        </Field>
                    </FieldGroup>
                    <Separator/>
                    <Field data-disabled={busy} orientation="horizontal">
                        <FieldContent>
                            <FieldLabel htmlFor="download-metadata">
                                Automatic tags & artwork
                            </FieldLabel>
                            <FieldDescription>
                                Find online suggestions before reviewing each download.
                            </FieldDescription>
                        </FieldContent>
                        <Checkbox
                            disabled={busy}
                            id="download-metadata"
                            checked={settings.fetchMetadata}
                            onCheckedChange={(value) => change({ fetchMetadata: Boolean(value) })}
                        />
                    </Field>
                </FieldGroup>
            </SettingsSection>

            {error &&
                <Alert variant="destructive">
                    <AlertDescription>
                        {error}
                    </AlertDescription>
                </Alert>
            }

            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border
            border-border/60 bg-card/95 px-5 py-4 backdrop-blur-xl">
                <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
                    {!dirty && notice &&
                        <Check className="size-3.5 text-primary"/>
                    }

                    {dirty
                        ? "You have unsaved changes."
                        : notice || "Your download preferences are up to date."
                    }
                </p>
                <div className="flex items-center gap-2">
                    {dirty &&
                        <Button variant="ghost" disabled={busy} onClick={() => void form.reset()}>
                            Discard
                        </Button>
                    }
                    <Button disabled={busy || !dirty} onClick={() => void form.save()}>
                        <Save data-icon="inline-start"/>
                        {busy ? "Working…" : "Save changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
