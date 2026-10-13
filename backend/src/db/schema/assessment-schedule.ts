import { datetime, int, mysqlTable, timestamp, boolean, unique, varchar } from 'drizzle-orm/mysql-core';
import { topics } from './topics';

export const assessmentSchedule = mysqlTable('assessment_schedule', {
  id: int('id').autoincrement().primaryKey(),
  topic_id: int('topic_id').notNull().references(() => topics.id),
  start_at: datetime('start_at'),
  end_at: datetime('end_at'),
  enabled: boolean('enabled').notNull().default(true),
  notes: varchar('notes', { length: 255 }),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [unique('assessment_schedule_topic_unique').on(table.topic_id)]);
