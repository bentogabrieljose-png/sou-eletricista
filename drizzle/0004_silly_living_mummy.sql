CREATE TABLE `material_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`materialKey` varchar(120) NOT NULL,
	`materialTitle` varchar(255) NOT NULL,
	`resourceUrl` varchar(500),
	`viewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notebook_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notebookId` int NOT NULL,
	`pageNumber` int NOT NULL,
	`contentHtml` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notebook_pages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notebook_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pageId` int NOT NULL,
	`contentHtml` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notebook_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notebooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`title` varchar(255) NOT NULL DEFAULT 'Caderno de apontamentos',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notebooks_id` PRIMARY KEY(`id`),
	CONSTRAINT `notebooks_applicationId_unique` UNIQUE(`applicationId`)
);
--> statement-breakpoint
CREATE INDEX `material_progress_application_material_idx` ON `material_progress` (`applicationId`,`materialKey`);--> statement-breakpoint
CREATE INDEX `notebook_pages_notebook_page_idx` ON `notebook_pages` (`notebookId`,`pageNumber`);--> statement-breakpoint
CREATE INDEX `notebook_versions_page_created_idx` ON `notebook_versions` (`pageId`,`createdAt`);