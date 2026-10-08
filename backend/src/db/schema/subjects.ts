import { mysqlTable, int, varchar } from 'drizzle-orm/mysql-core';
import { educationClasses } from './education-classes';
import { assessmentTypes } from './assessment-types';

export const subjects = mysqlTable('subjects', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  label: varchar('label', { length: 100 }).notNull(),
  display_order: int('display_order').notNull(),
  class_id: int('class_id').references(() => educationClasses.id),
  assessment_type_id: int('assessment_type_id').references(() => assessmentTypes.id),
});
