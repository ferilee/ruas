CREATE TABLE `topic_classes` (
	`topic_id` int NOT NULL,
	`class_id` int NOT NULL,
	CONSTRAINT `topic_classes_pk` PRIMARY KEY(`topic_id`,`class_id`)
);
--> statement-breakpoint
ALTER TABLE `topic_classes` ADD CONSTRAINT `topic_classes_topic_id_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `topic_classes` ADD CONSTRAINT `topic_classes_class_id_education_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `education_classes`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO `topic_classes` (`topic_id`, `class_id`)
SELECT `topics`.`id`, `subjects`.`class_id`
FROM `topics`
INNER JOIN `subjects` ON `subjects`.`id` = `topics`.`subject_id`
WHERE `subjects`.`class_id` IS NOT NULL;
--> statement-breakpoint
INSERT INTO `topic_classes` (`topic_id`, `class_id`)
SELECT `topics`.`id`, `education_classes`.`id`
FROM `topics`
INNER JOIN `subjects` ON `subjects`.`id` = `topics`.`subject_id`
CROSS JOIN `education_classes`
WHERE `subjects`.`class_id` IS NULL;
--> statement-breakpoint
UPDATE `subjects` SET `class_id` = NULL WHERE `class_id` IS NOT NULL;
