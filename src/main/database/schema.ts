import {index, integer, primaryKey, real, sqliteTable, text} from "drizzle-orm/sqlite-core";


export const tracks = sqliteTable("tracks", {
    id: integer().primaryKey(),
    path: text().notNull().unique(),
    title: text().notNull(),
    artist: text().notNull(),
    albumArtist: text("album_artist").notNull().default(""),
    album: text().notNull(),
    genre: text().notNull(),
    year: integer().notNull(),
    size: integer().notNull(),
    duration: real().notNull(),
    plays: integer().notNull().default(0),
    favorite: integer().notNull().default(0),
    lastPlayed: integer().notNull().default(0),
    cover: text(),
}, (table) => [
    index("track_album").on(table.album, table.artist),
]);


export const folders = sqliteTable("folders", {
    path: text().primaryKey(),
});


export const playlists = sqliteTable("playlists", {
    id: integer().primaryKey(),
    rule: text(),
    name: text().notNull(),
});


export const playlistTracks = sqliteTable("playlist_tracks", {
    trackId: integer().notNull().references(() => tracks.id, { onDelete: "cascade" }),
    playlistId: integer().notNull().references(() => playlists.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.playlistId, table.trackId] }),
]);
