CREATE INDEX `applications_status_created_at_idx` ON `applications` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `content_published_created_at_idx` ON `content_items` (`isPublished`,`createdAt`);--> statement-breakpoint
CREATE INDEX `courses_active_created_at_idx` ON `courses` (`active`,`createdAt`);--> statement-breakpoint
CREATE INDEX `exam_attempts_application_created_at_idx` ON `exam_attempts` (`applicationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `messages_application_created_at_idx` ON `messages` (`applicationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `student_progress_certificate_updated_at_idx` ON `student_progress` (`certificateStatus`,`updatedAt`);