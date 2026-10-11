ALTER TABLE `exam_attempts` ADD `deadline_at` timestamp;--> statement-breakpoint
ALTER TABLE `subjects` ADD `duration_minutes` int DEFAULT 0 NOT NULL;