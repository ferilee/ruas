import { boolean, int, json, mysqlTable, timestamp, unique } from 'drizzle-orm/mysql-core';
import { examAttempts } from './exam-attempts';
import { questions } from './questions';

export const examAnswers = mysqlTable('exam_answers', {
  id: int('id').autoincrement().primaryKey(),
  attempt_id: int('attempt_id').notNull().references(() => examAttempts.id),
  question_id: int('question_id').notNull().references(() => questions.id),
  selected_keys: json('selected_keys').notNull(),
  is_correct: boolean('is_correct').notNull(),
  elapsed_seconds: int('elapsed_seconds').notNull().default(0),
  answered_at: timestamp('answered_at').defaultNow().notNull(),
}, (table) => [unique('exam_answers_attempt_question_unique').on(table.attempt_id, table.question_id)]);
