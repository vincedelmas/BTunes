CREATE TABLE IF NOT EXISTS `folders` (
	`path` text PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `playlist_tracks` (
	`playlistId` integer NOT NULL,
	`trackId` integer NOT NULL,
	CONSTRAINT `playlist_tracks_pk` PRIMARY KEY(`playlistId`, `trackId`),
	CONSTRAINT `fk_playlist_tracks_playlistId_playlists_id_fk` FOREIGN KEY (`playlistId`) REFERENCES `playlists`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_playlist_tracks_trackId_tracks_id_fk` FOREIGN KEY (`trackId`) REFERENCES `tracks`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `playlists` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL,
	`rule` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tracks` (
	`id` integer PRIMARY KEY,
	`path` text NOT NULL UNIQUE,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`album` text NOT NULL,
	`genre` text NOT NULL,
	`year` integer NOT NULL,
	`duration` real NOT NULL,
	`favorite` integer DEFAULT 0 NOT NULL,
	`plays` integer DEFAULT 0 NOT NULL,
	`lastPlayed` integer DEFAULT 0 NOT NULL,
	`cover` text,
	`size` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `track_album` ON `tracks` (`album`,`artist`);