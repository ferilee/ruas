import { int, mysqlTable, text, timestamp, unique, varchar } from 'drizzle-orm/mysql-core';
import { questions } from './questions';

export const questionMedia = mysqlTable('question_media', {
  id: int('id').autoincrement().primaryKey(),
  question_id: int('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  object_key: varchar('object_key', { length: 500 }).notNull(),
  original_name: varchar('original_name', { length: 255 }).notNull(),
  mime_type: varchar('mime_type', { length: 100 }).notNull(),
  file_size: int('file_size').notNull(),
  alt_text: varchar('alt_text', { length: 255 }).notNull(),
  caption: text('caption'),
  display_order: int('display_order').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => [unique('question_media_object_key_unique').on(table.object_key)]);
