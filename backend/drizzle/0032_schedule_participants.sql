CREATE TABLE `assessment_schedule_participants` (
  `schedule_id` int NOT NULL,
  `user_id` int NOT NULL,
  CONSTRAINT `assessment_schedule_participants_schedule_id_user_id` PRIMARY KEY(`schedule_id`,`user_id`),
  CONSTRAINT `assessment_schedule_participants_schedule_id_fk` FOREIGN KEY (`schedule_id`) REFERENCES `assessment_schedule`(`id`),
  CONSTRAINT `assessment_schedule_participants_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
