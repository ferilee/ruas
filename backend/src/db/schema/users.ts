import { int, mysqlEnum, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { educationClasses } from './education-classes';
import { subjects } from './subjects';

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  display_name: varchar('display_name', { length: 150 }).notNull(),
  class_id: int('class_id').references(() => educationClasses.id),
  subject_id: int('subject_id').references(() => subjects.id),
  role: mysqlEnum('role', ['admin', 'editor', 'participant']).notNull().default('participant'),
  active: int('active').notNull().default(1),
  is_demo: int('is_demo').notNull().default(0),
  must_change_password: int('must_change_password').notNull().default(0),
  created_by: varchar('created_by', { length: 100 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
