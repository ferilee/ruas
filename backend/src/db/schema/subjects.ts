import { boolean, mysqlEnum, mysqlTable, int, varchar } from 'drizzle-orm/mysql-core';
import { educationClasses } from './education-classes';
import { assessmentTypes } from './assessment-types';

export const subjects = mysqlTable('subjects', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  label: varchar('label', { length: 100 }).notNull(),
  display_order: int('display_order').notNull(),
  max_attempts: int('max_attempts').notNull().default(1),
  explanation_mode: mysqlEnum('explanation_mode', ['after_answer', 'after_exam', 'hidden']).notNull().default('hidden'),
  show_correct_answer_on_wrong: boolean('show_correct_answer_on_wrong').notNull().default(false),
  shuffle_questions: boolean('shuffle_questions').notNull().default(false),
  shuffle_options: boolean('shuffle_options').notNull().default(false),
  class_id: int('class_id').references(() => educationClasses.id),
  assessment_type_id: int('assessment_type_id').references(() => assessmentTypes.id),
});
