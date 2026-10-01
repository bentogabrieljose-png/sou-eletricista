ALTER TABLE `content_items` ADD `mediaPosterUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `content_items` ADD `mediaDurationSeconds` int;--> statement-breakpoint
ALTER TABLE `content_items` ADD `mediaProcessingStatus` enum('not_applicable','processed','original') DEFAULT 'not_applicable' NOT NULL;