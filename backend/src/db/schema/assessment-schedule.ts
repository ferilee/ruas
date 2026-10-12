import { datetime, int, mysqlTable, timestamp, boolean, unique, varchar } from 'drizzle-orm/mysql-core';
import { assessmentTypes } from './assessment-types';

export const assessmentSchedule = mysqlTable('assessment_schedule', {
  id: int('id').autoincrement().primaryKey(),
  assessment_type_id: int('assessment_type_id').notNull().references(() => assessmentTypes.id),
  start_at: datetime('start_at'),
  end_at: datetime('end_at'),
  enabled: boolean('enabled').notNull().default(true),
  notes: varchar('notes', { length: 255 }),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [unique('assessment_schedule_assessment_type_unique').on(table.assessment_type_id)]);
