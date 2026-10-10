ALTER TABLE `education_classes` ADD `academic_year` varchar(20) DEFAULT '2026/2027' NOT NULL;--> statement-breakpoint
ALTER TABLE `education_classes` ADD `grade` int DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `education_classes` ADD `program` varchar(50) DEFAULT 'Umum' NOT NULL;--> statement-breakpoint
ALTER TABLE `education_classes` ADD `section` varchar(20);
--> statement-breakpoint
UPDATE `education_classes`
SET `academic_year` = '2026/2027', `grade` = CASE
  WHEN `slug` = 'kelas-10' THEN 10
  WHEN `slug` = 'kelas-11' THEN 11
  WHEN `slug` = 'kelas-12' THEN 12
  ELSE `grade`
END,
`program` = 'Umum'
WHERE `slug` IN ('kelas-10', 'kelas-11', 'kelas-12');
--> statement-breakpoint
INSERT IGNORE INTO `education_classes` (`slug`, `label`, `academic_year`, `grade`, `program`, `section`, `display_order`) VALUES
  ('11-tkj-a', 'Kelas 11 TKJ A', '2026/2027', 11, 'TKJ', 'A', 11),
  ('11-tkj-b', 'Kelas 11 TKJ B', '2026/2027', 11, 'TKJ', 'B', 12),
  ('11-rpl', 'Kelas 11 RPL', '2026/2027', 11, 'RPL', NULL, 13),
  ('11-dpib', 'Kelas 11 DPIB', '2026/2027', 11, 'DPIB', NULL, 14),
  ('11-kkkr', 'Kelas 11 KKKR', '2026/2027', 11, 'KKKR', NULL, 15),
  ('10-tkj-a', 'Kelas 10 TKJ A', '2026/2027', 10, 'TKJ', 'A', 16),
  ('10-tkr-a', 'Kelas 10 TKR A', '2026/2027', 10, 'TKR', 'A', 17),
  ('10-tkr-b', 'Kelas 10 TKR B', '2026/2027', 10, 'TKR', 'B', 18);
