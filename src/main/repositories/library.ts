import { DatabaseSync } from 'node:sqlite'
import type { Track, Playlist, Snapshot } from '../../shared/contracts'
export class LibraryRepository {
 readonly db: DatabaseSync
 constructor(file: string) {
  this.db = new DatabaseSync(file)
  this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
   CREATE TABLE IF NOT EXISTS tracks(id INTEGER PRIMARY KEY, path TEXT UNIQUE NOT NULL, title TEXT NOT NULL, artist TEXT NOT NULL, album TEXT NOT NULL, genre TEXT NOT NULL, year INTEGER NOT NULL, duration REAL NOT NULL, favorite INTEGER DEFAULT 0, plays INTEGER DEFAULT 0, lastPlayed INTEGER DEFAULT 0, cover TEXT, size INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS folders(path TEXT PRIMARY KEY);
   CREATE TABLE IF NOT EXISTS playlists(id INTEGER PRIMARY KEY, name TEXT NOT NULL, rule TEXT);
   CREATE TABLE IF NOT EXISTS playlist_tracks(playlistId INTEGER REFERENCES playlists(id) ON DELETE CASCADE, trackId INTEGER REFERENCES tracks(id) ON DELETE CASCADE, PRIMARY KEY(playlistId,trackId));
   CREATE INDEX IF NOT EXISTS track_album ON tracks(album,artist);`)
 }
 snapshot(): Snapshot {
  return { tracks: this.db.prepare('SELECT * FROM tracks ORDER BY artist,album,title').all() as Track[], playlists: this.db.prepare('SELECT * FROM playlists ORDER BY name').all() as Playlist[], folders: this.db.prepare('SELECT path FROM folders').all().map(x => x.path as string) }
 }
 get(id: number) { return this.db.prepare('SELECT * FROM tracks WHERE id=?').get(id) as Track | undefined }
 upsert(t: Omit<Track,'id'|'favorite'|'plays'|'lastPlayed'>) {
  this.db.prepare(`INSERT INTO tracks(path,title,artist,album,genre,year,duration,cover,size) VALUES(?,?,?,?,?,?,?,?,?)
   ON CONFLICT(path) DO UPDATE SET title=excluded.title,artist=excluded.artist,album=excluded.album,genre=excluded.genre,year=excluded.year,duration=excluded.duration,cover=excluded.cover,size=excluded.size`).run(t.path,t.title,t.artist,t.album,t.genre,t.year,t.duration,t.cover,t.size)
 }
 favorite(id: number) { this.db.prepare('UPDATE tracks SET favorite=1-favorite WHERE id=?').run(id) }
 played(id: number) { this.db.prepare('UPDATE tracks SET plays=plays+1,lastPlayed=? WHERE id=?').run(Date.now(),id) }
 folder(path: string) { this.db.prepare('INSERT OR IGNORE INTO folders VALUES(?)').run(path) }
 remove(path: string) { this.db.prepare('DELETE FROM tracks WHERE path=?').run(path) }
 create(name: string, rule?: string) { return Number(this.db.prepare('INSERT INTO playlists(name,rule) VALUES(?,?)').run(name,rule ?? null).lastInsertRowid) }
 add(playlist: number, track: number) { this.db.prepare('INSERT OR IGNORE INTO playlist_tracks VALUES(?,?)').run(playlist,track) }
 playlist(id: number) {
  const list = this.db.prepare('SELECT * FROM playlists WHERE id=?').get(id) as Playlist | undefined
  if (!list) throw new Error('Playlist introuvable')
  if (list.rule) return this.snapshot().tracks.filter(t => t.genre.toLocaleLowerCase() === list.rule!.toLocaleLowerCase()).map(t=>t.id)
  return this.db.prepare('SELECT trackId FROM playlist_tracks WHERE playlistId=? ORDER BY rowid').all(id).map(t=>Number(t.trackId))
 }
}
