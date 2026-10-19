CREATE TABLE `teacher_access_requests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `username` varchar(100) NOT NULL,
  `display_name` varchar(150) NOT NULL,
  `contact` varchar(150) NULL,
  `requested_class` varchar(150) NULL,
  `requested_subject` varchar(150) NULL,
  `password_hash` varchar(255) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` varchar(100) NULL,
  `reviewed_at` timestamp NULL,
  `rejection_reason` varchar(500) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `teacher_access_requests_id` PRIMARY KEY(`id`),
  CONSTRAINT `teacher_access_requests_username_unique` UNIQUE(`username`)
);
