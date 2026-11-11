import {eq, like} from "drizzle-orm";
import type {DatabaseSync} from "node:sqlite";
import {drizzle} from "drizzle-orm/node-sqlite";
import {appSettings, downloadHistory} from "../database/schema.ts";
import type {DownloadItem, DownloaderSettings} from "../../shared/types/downloads.ts";
import {downloaderSettingsSchema, stagedDownloadSchema} from "../../shared/schemas/downloads.ts";

export class DownloadRepository {
    private readonly queries: ReturnType<typeof drizzle>;

    constructor(db: DatabaseSync) {
        this.queries = drizzle({ client: db });
    }

    settings(): DownloaderSettings {
        const row = this.queries.select().from(appSettings).where(eq(appSettings.key, "downloader")).get();
        return downloaderSettingsSchema.parse(row ? JSON.parse(row.value) : {});
    }

    saveSettings(input: DownloaderSettings) {
        const settings = downloaderSettingsSchema.parse(input);
        this.queries.insert(appSettings).values({ key: "downloader", value: JSON.stringify(settings) })
            .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(settings) } }).run();
        return settings;
    }

    reviews() {
        return this.queries.select().from(appSettings).where(like(appSettings.key, "download-review:%")).all()
            .map((row) => stagedDownloadSchema.parse(JSON.parse(row.value)));
    }

    saveReview(item: DownloadItem, stage: string) {
        const value = JSON.stringify(stagedDownloadSchema.parse({ item, stage }));
        this.queries.insert(appSettings).values({ key: "download-review:" + item.id, value })
            .onConflictDoUpdate({ target: appSettings.key, set: { value } }).run();
    }

    removeReview(id: string) {
        this.queries.delete(appSettings).where(eq(appSettings.key, "download-review:" + id)).run();
    }

    history() {
        return new Map(this.queries.select().from(downloadHistory).all().map((row) => [row.videoId, row.path]));
    }

    complete(videoId: string, path: string) {
        this.queries.insert(downloadHistory).values({ videoId, path, completedAt: Date.now() })
            .onConflictDoUpdate({ target: downloadHistory.videoId, set: { path, completedAt: Date.now() } }).run();
    }
}
