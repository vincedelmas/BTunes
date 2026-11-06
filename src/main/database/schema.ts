import {index, integer, primaryKey, real, sqliteTable, text} from "drizzle-orm/sqlite-core";


export const tracks = sqliteTable("tracks", {
    id: integer().primaryKey(),
    path: text().notNull().unique(),
    title: text().notNull(),
    artist: text().notNull(),
    album: text().notNull(),
    genre: text().notNull(),
    year: integer().notNull(),
    duration: real().notNull(),
    favorite: integer().notNull().default(0),
    plays: integer().notNull().default(0),
    lastPlayed: integer().notNull().default(0),
    cover: text(),
    size: integer().notNull(),
}, (table) => [
    index("track_album").on(table.album, table.artist),
]);


export const folders = sqliteTable("folders", {
    path: text().primaryKey(),
});


export const playlists = sqliteTable("playlists", {
    id: integer().primaryKey(),
    name: text().notNull(),
    rule: text(),
});


export const playlistTracks = sqliteTable("playlist_tracks", {
    playlistId: integer()
        .notNull()
        .references(() => playlists.id, { onDelete: "cascade" }),
    trackId: integer()
        .notNull()
        .references(() => tracks.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.playlistId, table.trackId] }),
]);
