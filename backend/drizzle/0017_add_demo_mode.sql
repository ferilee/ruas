-- Custom SQL migration file, put your code below! --
ALTER TABLE `users` ADD `is_demo` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `participant_profiles` ADD `is_demo` int NOT NULL DEFAULT 0;
