import { int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

export const educationClasses = mysqlTable('education_classes', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  label: varchar('label', { length: 100 }).notNull(),
  academic_year: varchar('academic_year', { length: 20 }).notNull().default('2026/2027'),
  grade: int('grade').notNull().default(10),
  program: varchar('program', { length: 50 }).notNull().default('Umum'),
  section: varchar('section', { length: 20 }),
  display_order: int('display_order').notNull(),
  created_by: varchar('created_by', { length: 100 }),
});
