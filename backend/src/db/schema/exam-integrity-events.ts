import { int, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { examAttempts } from './exam-attempts';

export const examIntegrityEvents = mysqlTable('exam_integrity_events', {
  id: int('id').autoincrement().primaryKey(),
  attempt_id: int('attempt_id').notNull().references(() => examAttempts.id),
  event_type: varchar('event_type', { length: 50 }).notNull(),
  occurred_at: timestamp('occurred_at').defaultNow().notNull(),
});
