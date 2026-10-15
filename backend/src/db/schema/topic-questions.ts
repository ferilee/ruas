import { boolean, int, mysqlTable, primaryKey, timestamp } from 'drizzle-orm/mysql-core';
import { questions } from './questions';
import { topics } from './topics';

export const topicQuestions = mysqlTable('topic_questions', {
  topic_id: int('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  question_id: int('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(true),
  display_order: int('display_order').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.topic_id, table.question_id] })]);
