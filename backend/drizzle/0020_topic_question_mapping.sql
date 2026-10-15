CREATE TABLE `topic_questions` (
	`topic_id` int NOT NULL,
	`question_id` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`display_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `topic_questions_topic_id_question_id` PRIMARY KEY(`topic_id`,`question_id`),
	CONSTRAINT `topic_questions_topic_id_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE cascade ON UPDATE no action,
	CONSTRAINT `topic_questions_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint

INSERT INTO `topic_questions` (`topic_id`, `question_id`, `enabled`, `display_order`)
SELECT `topic_id`, `id`, true, `id`
FROM `questions`;
