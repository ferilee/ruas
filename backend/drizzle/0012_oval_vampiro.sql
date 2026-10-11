ALTER TABLE `exam_attempts` ADD `question_order` json;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD `option_order` json;--> statement-breakpoint
ALTER TABLE `subjects` ADD `show_correct_answer_on_wrong` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `subjects` ADD `shuffle_questions` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `subjects` ADD `shuffle_options` boolean DEFAULT false NOT NULL;