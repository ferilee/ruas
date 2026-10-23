import { int, mysqlTable, primaryKey } from 'drizzle-orm/mysql-core';
import { assessmentSchedule } from './assessment-schedule';
import { users } from './users';

export const assessmentScheduleParticipants = mysqlTable('assessment_schedule_participants', {
  schedule_id: int('schedule_id').notNull().references(() => assessmentSchedule.id),
  user_id: int('user_id').notNull().references(() => users.id),
}, (table) => [primaryKey({ columns: [table.schedule_id, table.user_id] })]);
