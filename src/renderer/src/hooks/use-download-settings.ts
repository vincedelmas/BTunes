import {rpc} from "@/lib/rpc";
import {useEffect, useState} from "react";
import {getErrorMessage} from "../../../shared/errors";
import {downloaderSettingsSchema} from "../../../shared/schemas/downloads";
import type {BookmarkFolder, DownloaderSettings} from "../../../shared/types/downloads";

export function useDownloadSettings() {
    const [settings, setSettings] = useState<DownloaderSettings>();
    const [saved, setSaved] = useState<DownloaderSettings>();
    const [folders, setFolders] = useState<BookmarkFolder[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const settings = await rpc("downloads.settings.get", undefined);
                if (!active) return;

                setSettings(settings);
                setSaved(settings);

                if (settings.bookmarksFile) {
                    const folders = await rpc("downloads.bookmarks.folders", { path: settings.bookmarksFile });
                    if (active) setFolders(folders);
                }
            }
            catch (error) {
                if (active) setError(getErrorMessage(error));
            }
        }

        void load();

        return () => {
            active = false;
        };
    }, []);

    function change(patch: Partial<DownloaderSettings>) {
        setSettings((settings) => settings ? { ...settings, ...patch } : settings);
        setNotice("");
    }

    async function run(operation: () => Promise<void>) {
        setBusy(true);
        setError("");
        setNotice("");

        try {
            await operation();
        }
        catch (error) {
            setError(getErrorMessage(error));
        }
        finally {
            setBusy(false);
        }
    }

    function chooseBookmarks() {
        return run(async () => {
            const path = await rpc("downloads.bookmarks.choose", undefined);
            if (!path) return;

            const folders = await rpc("downloads.bookmarks.folders", { path });
            change({ bookmarksFile: path, folderId: "" });
            setFolders(folders);
        });
    }

    function importSettings() {
        return run(async () => {
            const settings = await rpc("downloads.settings.import", undefined);
            if (!settings) return;

            setSettings(settings);
            setSaved(settings);
            setFolders(await rpc("downloads.bookmarks.folders", { path: settings.bookmarksFile }));
            setNotice("Music Downloader settings imported.");
        });
    }

    function save() {
        return run(async () => {
            const parsed = downloaderSettingsSchema.safeParse(settings);
            if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Check your download settings.");

            const saved = await rpc("downloads.settings.save", parsed.data);
            setSettings(saved);
            setSaved(saved);
            setNotice("Changes saved.");
        });
    }

    function reset() {
        return run(async () => {
            if (!saved) return;

            const folders = saved.bookmarksFile
                ? await rpc("downloads.bookmarks.folders", { path: saved.bookmarksFile })
                : [];

            setSettings(saved);
            setFolders(folders);
        });
    }

    return {
        settings, folders, busy, error, notice,
        dirty: Boolean(settings && JSON.stringify(settings) !== JSON.stringify(saved)),
        change, chooseBookmarks, importSettings, save, reset,
    };
}
