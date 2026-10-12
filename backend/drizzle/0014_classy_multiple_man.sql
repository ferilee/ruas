ALTER TABLE `assessment_schedule` MODIFY COLUMN `id` int AUTO_INCREMENT NOT NULL;--> statement-breakpoint
ALTER TABLE `assessment_schedule` ADD `assessment_type_id` int;--> statement-breakpoint
ALTER TABLE `assessment_schedule` ADD `end_at` datetime;--> statement-breakpoint
ALTER TABLE `assessment_schedule` ADD `enabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `assessment_schedule` ADD `notes` varchar(255);--> statement-breakpoint
UPDATE `assessment_schedule` SET `assessment_type_id` = (SELECT `id` FROM `assessment_types` ORDER BY `display_order`, `id` LIMIT 1) WHERE `assessment_type_id` IS NULL;--> statement-breakpoint
ALTER TABLE `assessment_schedule` MODIFY COLUMN `assessment_type_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `assessment_schedule` ADD CONSTRAINT `assessment_schedule_assessment_type_unique` UNIQUE(`assessment_type_id`);--> statement-breakpoint
ALTER TABLE `assessment_schedule` ADD CONSTRAINT `assessment_schedule_assessment_type_id_assessment_types_id_fk` FOREIGN KEY (`assessment_type_id`) REFERENCES `assessment_types`(`id`) ON DELETE no action ON UPDATE no action;
