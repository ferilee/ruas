ALTER TABLE `education_classes` ADD COLUMN IF NOT EXISTS `created_by` varchar(100) NULL;
ALTER TABLE `assessment_types` ADD COLUMN IF NOT EXISTS `created_by` varchar(100) NULL;
ALTER TABLE `subjects` ADD COLUMN IF NOT EXISTS `created_by` varchar(100) NULL;
ALTER TABLE `topics` ADD COLUMN IF NOT EXISTS `created_by` varchar(100) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `created_by` varchar(100) NULL;
