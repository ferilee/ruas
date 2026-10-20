import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';

export const feedbackEntries = mysqlTable('feedback_entries', {
  id: int('id').autoincrement().primaryKey(),
  kind: mysqlEnum('kind', ['suggestion', 'testimonial']).notNull(),
  message: text('message').notNull(),
  display_name: varchar('display_name', { length: 150 }).notNull(),
  role_label: varchar('role_label', { length: 100 }).notNull(),
  username: varchar('username', { length: 100 }),
  consent_public: int('consent_public').notNull().default(0),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected']).notNull().default('pending'),
  reviewed_by: varchar('reviewed_by', { length: 100 }),
  reviewed_at: timestamp('reviewed_at'),
  rejection_reason: varchar('rejection_reason', { length: 500 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
