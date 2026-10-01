CREATE TABLE `certificate_reprint_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`progressId` int NOT NULL,
	`requesterName` varchar(255) NOT NULL,
	`requesterEmail` varchar(320) NOT NULL,
	`paymentMethod` varchar(120) NOT NULL,
	`feeAmount` int NOT NULL DEFAULT 2000,
	`feeCurrency` varchar(8) NOT NULL DEFAULT 'Kz',
	`proofUrl` varchar(500),
	`proofKey` varchar(500),
	`proofName` varchar(255),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`downloadToken` varchar(80),
	`downloadedAt` timestamp,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `certificate_reprint_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificate_reprint_requests_downloadToken_unique` UNIQUE(`downloadToken`)
);
--> statement-breakpoint
ALTER TABLE `student_progress` ADD `accessExpiresAt` timestamp;--> statement-breakpoint
CREATE INDEX `certificate_reprint_status_created_at_idx` ON `certificate_reprint_requests` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `certificate_reprint_progress_idx` ON `certificate_reprint_requests` (`progressId`);