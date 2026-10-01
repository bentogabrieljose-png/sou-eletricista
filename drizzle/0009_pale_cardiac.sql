CREATE INDEX `applications_course_status_created_idx` ON `applications` (`courseTitle`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `applications_course_approved_idx` ON `applications` (`courseTitle`,`approvedAt`);--> statement-breakpoint
CREATE INDEX `student_progress_exam_score_idx` ON `student_progress` (`examStatus`,`latestScore`);