import { and, count, eq, notInArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { questions } from '@/db/schema/questions';
import { questionOptions } from '@/db/schema/question-options';
import { topicQuestions } from '@/db/schema/topic-questions';
import * as schema from '@/db/schema';
import type { Pool } from '@/db/connection';

type QuestionsDb = ReturnType<typeof drizzle>;

export interface QuestionOptionKeyText {
  key: string;
  text: string;
}

export interface QuestionOptionKeyCorrect {
  key: string;
  is_correct: boolean;
}

export function createQuestionsDb(pool: Pool) {
  return drizzle(pool, { schema, mode: 'default' });
}

export async function countQuestionsForTopic(db: QuestionsDb, topicId: number) {
  const [row] = await db
    .select({ total: count() })
    .from(topicQuestions)
    .where(and(eq(topicQuestions.topic_id, topicId), eq(topicQuestions.enabled, true)));

  return Number(row?.total ?? 0);
}

export async function findRandomQuestion(
  db: QuestionsDb,
  topicId: number,
  excludeIds: number[],
) {
  const conditions = [
    eq(topicQuestions.topic_id, topicId),
    eq(topicQuestions.enabled, true),
  ];
  if (excludeIds.length > 0) conditions.push(notInArray(questions.id, excludeIds));

  const [countRow] = await db
    .select({ total: count() })
    .from(topicQuestions)
    .innerJoin(questions, eq(questions.id, topicQuestions.question_id))
    .where(and(...conditions))
    .limit(1);

  const total = Number(countRow?.total ?? 0);
  if (total === 0) {
    return null;
  }

  const randomOffset = Math.floor(Math.random() * total);

  const [question] = await db
    .select({
      id: questions.id,
      topic_id: questions.topic_id,
      type: questions.type,
      difficulty: questions.difficulty,
      question_text: questions.question_text,
      explanation_text: questions.explanation_text,
      external_id: questions.external_id,
      created_at: questions.created_at,
    })
    .from(questions)
    .innerJoin(topicQuestions, and(
      eq(topicQuestions.question_id, questions.id),
      eq(topicQuestions.topic_id, topicId),
      eq(topicQuestions.enabled, true),
    ))
    .where(and(...conditions))
    .orderBy(questions.id)
    .limit(1)
    .offset(randomOffset);

  return question ?? null;
}

export async function findQuestionOptions(
  db: QuestionsDb,
  questionId: number,
): Promise<QuestionOptionKeyText[]> {
  return db
    .select({
      key: questionOptions.option_key,
      text: questionOptions.option_text,
    })
    .from(questionOptions)
    .where(eq(questionOptions.question_id, questionId))
    .orderBy(questionOptions.display_order);
}

export async function findQuestionById(db: QuestionsDb, questionId: number) {
  const [question] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);

  return question ?? null;
}

export async function findQuestionExplanationMode(db: QuestionsDb, questionId: number) {
  const [row] = await db
    .select({ explanation_mode: schema.subjects.explanation_mode })
    .from(questions)
    .innerJoin(schema.topics, eq(questions.topic_id, schema.topics.id))
    .innerJoin(schema.subjects, eq(schema.topics.subject_id, schema.subjects.id))
    .where(eq(questions.id, questionId))
    .limit(1);

  return row?.explanation_mode ?? 'hidden';
}

export async function findQuestionFeedbackSettings(db: QuestionsDb, questionId: number) {
  const [row] = await db
    .select({
      explanation_mode: schema.subjects.explanation_mode,
      show_correct_answer_on_wrong: schema.subjects.show_correct_answer_on_wrong,
    })
    .from(questions)
    .innerJoin(schema.topics, eq(questions.topic_id, schema.topics.id))
    .innerJoin(schema.subjects, eq(schema.topics.subject_id, schema.subjects.id))
    .where(eq(questions.id, questionId))
    .limit(1);

  return {
    explanation_mode: row?.explanation_mode ?? 'hidden',
    show_correct_answer_on_wrong: Boolean(row?.show_correct_answer_on_wrong),
  } as const;
}

export async function findQuestionAnswerKey(
  db: QuestionsDb,
  questionId: number,
): Promise<QuestionOptionKeyCorrect[]> {
  return db
    .select({
      key: questionOptions.option_key,
      is_correct: questionOptions.is_correct,
    })
    .from(questionOptions)
    .where(eq(questionOptions.question_id, questionId));
}
