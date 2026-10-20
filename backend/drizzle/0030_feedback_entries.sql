CREATE TABLE `feedback_entries` (
  `id` int AUTO_INCREMENT NOT NULL,
  `kind` enum('suggestion','testimonial') NOT NULL,
  `message` text NOT NULL,
  `display_name` varchar(150) NOT NULL,
  `role_label` varchar(100) NOT NULL,
  `username` varchar(100) NULL,
  `consent_public` int NOT NULL DEFAULT 0,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` varchar(100) NULL,
  `reviewed_at` timestamp NULL,
  `rejection_reason` varchar(500) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `feedback_entries_id` PRIMARY KEY(`id`)
);
