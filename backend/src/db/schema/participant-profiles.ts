import { int, mysqlEnum, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { subjects } from './subjects';

export const participantProfiles = mysqlTable('participant_profiles', {
  id: int('id').autoincrement().primaryKey(),
  identity_key: varchar('identity_key', { length: 191 }).notNull().unique(),
  participant_code: varchar('participant_code', { length: 100 }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  gender: mysqlEnum('gender', ['male', 'female']).notNull(),
  birth_date: varchar('birth_date', { length: 10 }).notNull(),
  subject_id: int('subject_id').notNull().references(() => subjects.id),
  access_token: varchar('access_token', { length: 255 }),
  is_demo: int('is_demo').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
