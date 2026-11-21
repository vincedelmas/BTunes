import {resolve} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {drizzle} from "drizzle-orm/node-sqlite";
import {genreKey} from "../../shared/genres.ts";
import {and, eq, inArray, sql} from "drizzle-orm";
import {migrate} from "drizzle-orm/node-sqlite/migrator";
import {folders, playlists, playlistTracks, tracks} from "../database/schema.ts";
import type {IndexedFile, IndexedTrack, Snapshot, TrackActivity, TrackActivityUpdate} from "../../shared/types/library";


const activityHistoryLimit = 256;
const trackActivityColumns = { id: tracks.id, plays: tracks.plays, favorite: tracks.favorite, lastPlayed: tracks.lastPlayed };


export class LibraryRepository {
    private currentRevision = 0;
    private readonly activityHistory = new Map<number, TrackActivity>();
    private readonly changed: () => void;
    readonly db: DatabaseSync;
    private readonly queries: ReturnType<typeof drizzle>;

    constructor(file: string, migrationsFolder = resolve("drizzle"), changed = () => {}) {
        this.changed = changed;
        this.db = new DatabaseSync(file);
        this.db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON;");
        this.queries = drizzle({ client: this.db });

        try {
            migrate(this.queries, { migrationsFolder });
        }
        catch (error) {
            this.db.close();
            throw error;
        }
    }

    get revision() {
        return this.currentRevision;
    }

    private bumpRevision(activity?: TrackActivity) {
        this.currentRevision++;
        if (activity) {
            this.activityHistory.set(this.revision, activity);
            if (this.activityHistory.size > activityHistoryLimit) {
                this.activityHistory.delete(this.activityHistory.keys().next().value!);
            }
        }
        else {
            this.activityHistory.clear();
        }

        this.changed();
    }

    changesSince(revision: number): Snapshot | TrackActivityUpdate | null {
        if (revision === this.revision) return null;

        // The history holds consecutive activity revisions since the last full change or eviction.
        const oldestBaseRevision = this.revision - this.activityHistory.size;
        if (revision < oldestBaseRevision || revision > this.revision) {
            return this.snapshot();
        }

        const latest = new Map<number, TrackActivity>();
        for (const [changedAt, activity] of this.activityHistory) {
            if (changedAt > revision) latest.set(activity.id, activity);
        }

        return { revision: this.revision, activity: [...latest.values()] };
    }

    genres() {
        // Preserve the spelling frequency and tie order used by the library UI.
        return this.queries.select({ genre: tracks.genre })
            .from(tracks)
            .orderBy(tracks.artist, tracks.album, tracks.title)
            .all()
            .map((track) => track.genre);
    }

    downloadMatches() {
        return this.queries.select({
            path: tracks.path,
            title: tracks.title,
            artist: tracks.artist,
            albumArtist: tracks.albumArtist,
        }).from(tracks).all();
    }

    checkpoint() {
        const result = this.db.prepare("PRAGMA wal_checkpoint(PASSIVE);").get();
        return result?.log === result?.checkpointed;
    }

    coverHashes() {
        return this.queries.selectDistinct({ cover: tracks.cover })
            .from(tracks).all().map((track) => track.cover);
    }

    snapshot(): Snapshot {
        return {
            revision: this.revision,

            tracks: this.queries
                .select()
                .from(tracks)
                .orderBy(tracks.artist, tracks.album, tracks.title)
                .all(),

            playlists: this.queries
                .select()
                .from(playlists)
                .orderBy(playlists.name)
                .all(),

            folders: this.queries
                .select()
                .from(folders)
                .all()
                .map((folder) => folder.path),
        };
    }

    get(id: number) {
        return this.queries
            .select()
            .from(tracks)
            .where(eq(tracks.id, id))
            .get();
    }

    upsert(track: IndexedTrack) {
        this.queries.insert(tracks)
            .values(track)
            .onConflictDoUpdate({ set: track, target: tracks.path })
            .run();

        this.bumpRevision();
    }

    upsertScan(batch: Required<IndexedTrack>[]) {
        if (!batch.length) return;

        // A multi-row statement commits the batch atomically under FULL durability.
        this.queries.insert(tracks)
            .values(batch)
            .onConflictDoUpdate({
                target: tracks.path,
                set: {
                    year: sql`excluded.year`,
                    size: sql`excluded.size`,
                    cover: sql`excluded.cover`,
                    title: sql`excluded.title`,
                    genre: sql`excluded.genre`,
                    album: sql`excluded.album`,
                    artist: sql`excluded.artist`,
                    duration: sql`excluded.duration`,
                    modifiedAt: sql`excluded.modified_at`,
                    albumArtist: sql`excluded.album_artist`,
                },
            }).run();
        this.bumpRevision();
    }

    favorite(id: number) {
        const activity = this.queries
            .update(tracks)
            .set({ favorite: sql`1 - ${tracks.favorite}` })
            .where(eq(tracks.id, id))
            .returning(trackActivityColumns)
            .get();

        if (activity) this.bumpRevision(activity);
    }

    played(id: number) {
        const activity = this.queries
            .update(tracks)
            .set({
                lastPlayed: Date.now(),
                plays: sql`${tracks.plays} + 1`,
            })
            .where(eq(tracks.id, id))
            .returning(trackActivityColumns)
            .get();

        if (activity) this.bumpRevision(activity);
    }

    folder(path: string, identity = "") {
        this.queries
            .insert(folders)
            .values({ path, identity })
            .onConflictDoUpdate({ target: folders.path, set: { identity } })
            .run();

        this.bumpRevision();
    }

    watchedFolders() {
        return this.queries
            .select()
            .from(folders)
            .all();
    }

    indexedFiles(): IndexedFile[] {
        return this.queries
            .select({
                path: tracks.path,
                size: tracks.size,
                modifiedAt: tracks.modifiedAt,
                duration: tracks.duration,
                albumArtist: tracks.albumArtist,
            }).from(tracks)
            .all();
    }

    remove(path: string) {
        this.queries
            .delete(tracks)
            .where(eq(tracks.path, path))
            .run();

        this.bumpRevision();
    }

    create(name: string, rule?: string) {
        const result = this.queries
            .insert(playlists)
            .values({ name, rule: rule ?? null })
            .returning({ id: playlists.id })
            .get()!.id;

        this.bumpRevision();

        return result;
    }

    updatePlaylist(id: number, name: string, rule?: string) {
        const updated = this.queries.update(playlists)
            .set({ name, rule: rule ?? null })
            .where(eq(playlists.id, id))
            .returning({ id: playlists.id })
            .get();

        if (!updated) throw new Error("Playlist not found.");

        this.bumpRevision();
    }

    deletePlaylist(id: number) {
        const deleted = this.queries.delete(playlists)
            .where(eq(playlists.id, id))
            .returning({ id: playlists.id }).get();

        if (!deleted) throw new Error("Playlist not found.");

        this.bumpRevision();
    }

    private requireClassicPlaylist(id: number) {
        const playlist = this.queries
            .select()
            .from(playlists)
            .where(eq(playlists.id, id))
            .get();

        if (!playlist || playlist.rule) {
            throw new Error("Only classic playlists can be edited manually.");
        }
    }

    add(playlistId: number, input: number | number[]) {
        this.requireClassicPlaylist(playlistId);
        const ids = [...new Set(Array.isArray(input) ? input : [input])];

        if (!ids.length) return;

        this.queries.insert(playlistTracks)
            .values(ids.map((trackId) => ({ playlistId, trackId })))
            .onConflictDoNothing()
            .run();

        this.bumpRevision();
    }

    removeFromPlaylist(playlistId: number, input: number | number[]) {
        this.requireClassicPlaylist(playlistId);
        const ids = [...new Set(Array.isArray(input) ? input : [input])];

        if (!ids.length) return;

        this.queries
            .delete(playlistTracks)
            .where(and(
                eq(playlistTracks.playlistId, playlistId),
                inArray(playlistTracks.trackId, ids),
            )).run();

        this.bumpRevision();
    }

    playlist(id: number) {
        const playlist = this.queries
            .select()
            .from(playlists)
            .where(eq(playlists.id, id))
            .get();

        if (!playlist) {
            throw new Error("Playlist not found");
        }

        if (playlist.rule) {
            const genre = genreKey(playlist.rule);

            return this.queries
                .select({ id: tracks.id, genre: tracks.genre })
                .from(tracks).all()
                .filter((track) => genreKey(track.genre) === genre)
                .map((track) => track.id);
        }

        return this.queries
            .select({ trackId: playlistTracks.trackId })
            .from(playlistTracks)
            .where(eq(playlistTracks.playlistId, id))
            .orderBy(sql`rowid`).all()
            .map((track) => track.trackId);
    }
}
