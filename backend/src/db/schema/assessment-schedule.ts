import { datetime, int, mysqlTable, timestamp } from 'drizzle-orm/mysql-core';

export const assessmentSchedule = mysqlTable('assessment_schedule', {
  id: int('id').primaryKey(),
  start_at: datetime('start_at'),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
