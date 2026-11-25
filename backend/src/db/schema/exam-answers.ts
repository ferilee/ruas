import { boolean, double, int, json, mysqlTable, text, timestamp, unique, varchar } from 'drizzle-orm/mysql-core';
import { examAttempts } from './exam-attempts';
import { questions } from './questions';

export const examAnswers = mysqlTable('exam_answers', {
  id: int('id').autoincrement().primaryKey(),
  attempt_id: int('attempt_id').notNull().references(() => examAttempts.id),
  question_id: int('question_id').notNull().references(() => questions.id),
  selected_keys: json('selected_keys').notNull(),
  // Teks jawaban bebas untuk soal Uraian Singkat (short_essay); jenis lain
  // selalu null. Penilaian manual guru tercatat pada score_fraction (0..1)
  // beserta graded_by/graded_at; selama belum dinilai score_fraction null.
  answer_text: text('answer_text'),
  graded_by: varchar('graded_by', { length: 100 }),
  graded_at: timestamp('graded_at'),
  is_correct: boolean('is_correct').notNull(),
  score_fraction: double('score_fraction'),
  elapsed_seconds: int('elapsed_seconds').notNull().default(0),
  answered_at: timestamp('answered_at').defaultNow().notNull(),
}, (table) => [unique('exam_answers_attempt_question_unique').on(table.attempt_id, table.question_id)]);
