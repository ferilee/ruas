CREATE TABLE `assessment_schedule` (
	`id` int NOT NULL,
	`start_at` datetime,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessment_schedule_id` PRIMARY KEY(`id`)
);
