CREATE TABLE `simak_handoff_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`username` varchar(100) NOT NULL,
	`target_type` varchar(20) NOT NULL,
	`target_topic_id` int NULL,
	`target_subject_id` int NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `simak_handoff_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `simak_handoff_tokens_token_hash_unique` UNIQUE(`token_hash`)
);
