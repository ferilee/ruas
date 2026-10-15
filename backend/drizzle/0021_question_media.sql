CREATE TABLE `question_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_id` int NOT NULL,
	`object_key` varchar(500) NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`file_size` int NOT NULL,
	`alt_text` varchar(255) NOT NULL,
	`caption` text,
	`display_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `question_media_id` PRIMARY KEY(`id`),
	CONSTRAINT `question_media_object_key_unique` UNIQUE(`object_key`),
	CONSTRAINT `question_media_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action
);
