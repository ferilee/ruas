ALTER TABLE `topics` ADD `requires_token` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `topics` ADD `token_hash` varchar(64);