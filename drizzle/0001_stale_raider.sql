CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationNumber` varchar(32) NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`nif` varchar(80) NOT NULL,
	`phone` varchar(80) NOT NULL,
	`courseTitle` varchar(255) NOT NULL,
	`paymentMethod` varchar(120) NOT NULL,
	`proofUrl` varchar(500),
	`proofKey` varchar(500),
	`proofName` varchar(255),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`accessCode` varchar(32),
	`approvedAt` timestamp,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `applications_applicationNumber_unique` UNIQUE(`applicationNumber`),
	CONSTRAINT `applications_accessCode_unique` UNIQUE(`accessCode`)
);
--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('welcome_video','course_video','update') NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text,
	`mediaUrl` varchar(500),
	`isPublished` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`hours` int NOT NULL DEFAULT 12,
	`lessonUrl` varchar(500) NOT NULL,
	`coverUrl` varchar(500),
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `courses_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `exam_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`score` int NOT NULL,
	`passed` int NOT NULL,
	`answers` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int,
	`fromRole` enum('student','coordination') NOT NULL,
	`subject` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`messageStatus` enum('open','answered') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`startedAt` timestamp,
	`accessUnlockAt` timestamp,
	`completedAt` timestamp,
	`latestScore` int,
	`examStatus` enum('not_started','available','passed','retry') NOT NULL DEFAULT 'not_started',
	`certificateStatus` enum('not_eligible','pending','approved','rejected') NOT NULL DEFAULT 'not_eligible',
	`certificateUrl` varchar(500),
	`certificateNumber` varchar(80),
	`qrToken` varchar(80),
	`attempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_progress_applicationId_unique` UNIQUE(`applicationId`),
	CONSTRAINT `student_progress_qrToken_unique` UNIQUE(`qrToken`)
);
