import { int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

export const assessmentTypes = mysqlTable('assessment_types', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  label: varchar('label', { length: 100 }).notNull(),
  display_order: int('display_order').notNull(),
  created_by: varchar('created_by', { length: 100 }),
});
