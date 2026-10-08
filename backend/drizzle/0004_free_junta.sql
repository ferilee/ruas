CREATE TABLE `exam_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attempt_id` int NOT NULL,
	`question_id` int NOT NULL,
	`selected_keys` json NOT NULL,
	`is_correct` boolean NOT NULL,
	`elapsed_seconds` int NOT NULL DEFAULT 0,
	`answered_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_answers_id` PRIMARY KEY(`id`),
	CONSTRAINT `exam_answers_attempt_question_unique` UNIQUE(`attempt_id`,`question_id`)
);
--> statement-breakpoint
CREATE TABLE `exam_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participant_id` int NOT NULL,
	`subject_id` int NOT NULL,
	`topic_id` int NOT NULL,
	`status` enum('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
	`total_questions` int NOT NULL,
	`answered_questions` int NOT NULL DEFAULT 0,
	`correct_count` int NOT NULL DEFAULT 0,
	`incorrect_count` int NOT NULL DEFAULT 0,
	`total_time_seconds` int NOT NULL DEFAULT 0,
	`accuracy` int NOT NULL DEFAULT 0,
	`violation_count` int NOT NULL DEFAULT 0,
	`integrity_penalty` int NOT NULL DEFAULT 0,
	`final_score` int NOT NULL DEFAULT 0,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `exam_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_integrity_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attempt_id` int NOT NULL,
	`event_type` varchar(50) NOT NULL,
	`occurred_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_integrity_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `participant_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`identity_key` varchar(191) NOT NULL,
	`participant_code` varchar(100) NOT NULL,
	`name` varchar(150) NOT NULL,
	`gender` enum('male','female') NOT NULL,
	`birth_date` varchar(10) NOT NULL,
	`subject_id` int NOT NULL,
	`access_token` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `participant_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `participant_profiles_identity_key_unique` UNIQUE(`identity_key`)
);
--> statement-breakpoint
ALTER TABLE `exam_answers` ADD CONSTRAINT `exam_answers_attempt_id_exam_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_answers` ADD CONSTRAINT `exam_answers_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_participant_id_participant_profiles_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `participant_profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_topic_id_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_integrity_events` ADD CONSTRAINT `exam_integrity_events_attempt_id_exam_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participant_profiles` ADD CONSTRAINT `participant_profiles_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;