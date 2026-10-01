ALTER TABLE `applications` ADD `proofInspectionStatus` enum('not_checked','consistent','review','inconsistent') DEFAULT 'not_checked' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `proofInspectionReport` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `proofInspectionCheckedAt` timestamp;