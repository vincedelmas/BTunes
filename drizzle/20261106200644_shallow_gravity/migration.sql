CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `download_history` (
	`video_id` text PRIMARY KEY,
	`path` text NOT NULL,
	`completed_at` integer NOT NULL
);
