import {resolve} from "node:path";
import {eq, sql} from "drizzle-orm";
import {DatabaseSync} from "node:sqlite";
import {drizzle} from "drizzle-orm/node-sqlite";
import {migrate} from "drizzle-orm/node-sqlite/migrator";
import type {Snapshot, Track} from "../../shared/contracts";
import {folders, playlists, playlistTracks, tracks} from "../database/schema.ts";


type IndexedTrack = Omit<Track, "id" | "favorite" | "plays" | "lastPlayed">;


export class LibraryRepository {
    readonly db: DatabaseSync;
    private readonly queries: ReturnType<typeof drizzle>;

    constructor(file: string, migrationsFolder = resolve("drizzle")) {
        this.db = new DatabaseSync(file);
        this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
        this.queries = drizzle({ client: this.db });

        try {
            migrate(this.queries, { migrationsFolder });
        }
        catch (error) {
            this.db.close();
            throw error;
        }
    }

    snapshot(): Snapshot {
        return {
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
        this.queries
            .insert(tracks)
            .values(track)
            .onConflictDoUpdate({
                set: track,
                target: tracks.path,
            }).run();
    }

    favorite(id: number) {
        this.queries
            .update(tracks)
            .set({ favorite: sql`1 - ${tracks.favorite}` })
            .where(eq(tracks.id, id))
            .run();
    }

    played(id: number) {
        this.queries
            .update(tracks)
            .set({
                lastPlayed: Date.now(),
                plays: sql`${tracks.plays} + 1`,
            })
            .where(eq(tracks.id, id))
            .run();
    }

    folder(path: string) {
        this.queries
            .insert(folders)
            .values({ path })
            .onConflictDoNothing()
            .run();
    }

    remove(path: string) {
        this.queries
            .delete(tracks)
            .where(eq(tracks.path, path))
            .run();
    }

    create(name: string, rule?: string) {
        return this.queries
            .insert(playlists)
            .values({ name, rule: rule ?? null })
            .returning({ id: playlists.id })
            .get()!.id;
    }

    add(playlistId: number, trackId: number) {
        this.queries
            .insert(playlistTracks)
            .values({ playlistId, trackId })
            .onConflictDoNothing()
            .run();
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
            const genre = playlist.rule.toLocaleLowerCase();

            return this.queries
                .select({ id: tracks.id, genre: tracks.genre })
                .from(tracks).all()
                .filter((track) => track.genre.toLocaleLowerCase() === genre)
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
