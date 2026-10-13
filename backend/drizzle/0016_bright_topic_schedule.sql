ALTER TABLE `assessment_schedule` ADD `topic_id` int;--> statement-breakpoint
INSERT INTO `assessment_schedule` (`topic_id`, `start_at`, `end_at`, `enabled`, `notes`, `updated_at`)
SELECT `topics`.`id`, `legacy`.`start_at`, `legacy`.`end_at`, `legacy`.`enabled`, `legacy`.`notes`, `legacy`.`updated_at`
FROM `assessment_schedule` AS `legacy`
INNER JOIN `subjects` ON `subjects`.`assessment_type_id` = `legacy`.`assessment_type_id`
INNER JOIN `topics` ON `topics`.`subject_id` = `subjects`.`id`
WHERE `legacy`.`topic_id` IS NULL;--> statement-breakpoint
ALTER TABLE `assessment_schedule` DROP FOREIGN KEY `assessment_schedule_assessment_type_id_assessment_types_id_fk`;--> statement-breakpoint
ALTER TABLE `assessment_schedule` DROP INDEX `assessment_schedule_assessment_type_unique`;--> statement-breakpoint
DELETE FROM `assessment_schedule` WHERE `topic_id` IS NULL;--> statement-breakpoint
ALTER TABLE `assessment_schedule` DROP COLUMN `assessment_type_id`;--> statement-breakpoint
ALTER TABLE `assessment_schedule` MODIFY COLUMN `topic_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `assessment_schedule` ADD CONSTRAINT `assessment_schedule_topic_unique` UNIQUE(`topic_id`);--> statement-breakpoint
ALTER TABLE `assessment_schedule` ADD CONSTRAINT `assessment_schedule_topic_id_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE no action ON UPDATE no action;
