import { int, mysqlEnum, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';

export const teacherAccessRequests = mysqlTable('teacher_access_requests', {
  id: int('id').autoincrement().primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  display_name: varchar('display_name', { length: 150 }).notNull(),
  contact: varchar('contact', { length: 150 }),
  requested_class: varchar('requested_class', { length: 150 }),
  requested_subject: varchar('requested_subject', { length: 150 }),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected']).notNull().default('pending'),
  reviewed_by: varchar('reviewed_by', { length: 100 }),
  reviewed_at: timestamp('reviewed_at'),
  rejection_reason: varchar('rejection_reason', { length: 500 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
