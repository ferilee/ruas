ALTER TABLE `questions` MODIFY COLUMN `type` enum('single_choice','multiple_response','true_false','true_false_multi') NOT NULL;--> statement-breakpoint
ALTER TABLE `exam_answers` ADD COLUMN `score_fraction` double NULL;
