ALTER TABLE `topics` MODIFY COLUMN `requires_token` boolean NOT NULL DEFAULT true;
UPDATE `topics` SET `requires_token` = true;
