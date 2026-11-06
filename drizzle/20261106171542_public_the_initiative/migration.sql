ALTER TABLE `folders` ADD `identity` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `tracks` ADD `modified_at` real DEFAULT 0 NOT NULL;