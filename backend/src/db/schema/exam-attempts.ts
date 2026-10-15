import { int, json, mysqlEnum, mysqlTable, timestamp } from 'drizzle-orm/mysql-core';
import { participantProfiles } from './participant-profiles';
import { subjects } from './subjects';
import { topics } from './topics';

export const examAttempts = mysqlTable('exam_attempts', {
  id: int('id').autoincrement().primaryKey(),
  participant_id: int('participant_id').notNull().references(() => participantProfiles.id),
  subject_id: int('subject_id').notNull().references(() => subjects.id),
  topic_id: int('topic_id').notNull().references(() => topics.id),
  status: mysqlEnum('status', ['in_progress', 'completed', 'abandoned']).notNull().default('in_progress'),
  total_questions: int('total_questions').notNull(),
  answered_questions: int('answered_questions').notNull().default(0),
  correct_count: int('correct_count').notNull().default(0),
  incorrect_count: int('incorrect_count').notNull().default(0),
  total_time_seconds: int('total_time_seconds').notNull().default(0),
  accuracy: int('accuracy').notNull().default(0),
  violation_count: int('violation_count').notNull().default(0),
  integrity_penalty: int('integrity_penalty').notNull().default(0),
  final_score: int('final_score').notNull().default(0),
  question_order: json('question_order').$type<number[]>(),
  option_order: json('option_order').$type<Record<string, string[]>>(),
  doubtful_question_ids: json('doubtful_question_ids').$type<number[]>(),
  started_at: timestamp('started_at').defaultNow().notNull(),
  deadline_at: timestamp('deadline_at'),
  minimum_duration_minutes: int('minimum_duration_minutes').notNull().default(0),
  completed_at: timestamp('completed_at'),
});
