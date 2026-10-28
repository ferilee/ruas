CREATE TABLE `user_classes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int NOT NULL,
  `class_id` int NOT NULL,
  `source` enum('admin','self') NOT NULL DEFAULT 'admin',
  `created_by` varchar(100) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `user_classes_id` PRIMARY KEY(`id`),
  CONSTRAINT `user_classes_user_id_class_id_unique` UNIQUE(`user_id`,`class_id`),
  CONSTRAINT `user_classes_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  CONSTRAINT `user_classes_class_id_fk` FOREIGN KEY (`class_id`) REFERENCES `education_classes`(`id`)
);
--> statement-breakpoint
INSERT IGNORE INTO `user_classes` (`user_id`, `class_id`, `source`)
SELECT `id`, `class_id`, 'admin' FROM `users` WHERE `class_id` IS NOT NULL AND `role` IN ('admin', 'editor');
