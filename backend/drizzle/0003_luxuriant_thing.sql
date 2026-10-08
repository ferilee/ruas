CREATE TABLE `assessment_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(50) NOT NULL,
	`label` varchar(100) NOT NULL,
	`display_order` int NOT NULL,
	CONSTRAINT `assessment_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `assessment_types_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `education_classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(50) NOT NULL,
	`label` varchar(100) NOT NULL,
	`display_order` int NOT NULL,
	CONSTRAINT `education_classes_id` PRIMARY KEY(`id`),
	CONSTRAINT `education_classes_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `subjects` ADD `class_id` int;--> statement-breakpoint
ALTER TABLE `subjects` ADD `assessment_type_id` int;--> statement-breakpoint
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_class_id_education_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `education_classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_assessment_type_id_assessment_types_id_fk` FOREIGN KEY (`assessment_type_id`) REFERENCES `assessment_types`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT IGNORE INTO `education_classes` (`slug`, `label`, `display_order`) VALUES
  ('kelas-10', 'Kelas 10', 1),
  ('kelas-11', 'Kelas 11', 2),
  ('kelas-12', 'Kelas 12', 3);
--> statement-breakpoint
INSERT IGNORE INTO `assessment_types` (`slug`, `label`, `display_order`) VALUES
  ('asesmen-ruas', 'Asesmen Ruas', 1);
