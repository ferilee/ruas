ALTER TABLE `questions` MODIFY COLUMN `type` enum('single_choice','multiple_response','true_false','true_false_multi','short_essay') NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD COLUMN `grading_guide` text NULL;--> statement-breakpoint
ALTER TABLE `exam_answers` ADD COLUMN `answer_text` text NULL;--> statement-breakpoint
ALTER TABLE `exam_answers` ADD COLUMN `graded_by` varchar(100) NULL;--> statement-breakpoint
ALTER TABLE `exam_answers` ADD COLUMN `graded_at` timestamp NULL;
