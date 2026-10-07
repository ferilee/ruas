import { and, desc, eq, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { questions } from '@/db/schema/questions';
import { questionOptions } from '@/db/schema/question-options';
import { topics } from '@/db/schema/topics';
import * as schema from '@/db/schema';
import type { Pool } from '@/db/connection';
import type { QuestionType } from '@/lib/scoring';
import type { AdminQuestionInput, ImportQuestion } from '@/validators/admin-question-validator';

type AdminDb = ReturnType<typeof drizzle>;
type InsertDb = Pick<AdminDb, 'insert'>;

export interface AdminQuestionListItem {
  id: number;
  topic_id: number;
  topic_slug: string;
  topic_label: string;
  type: QuestionType;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  external_id: string | null;
}

export interface AdminQuestionDetail extends AdminQuestionListItem {
  explanation_text: string;
  options: Array<{ key: string; text: string; is_correct: boolean }>;
}

export function createAdminDb(pool: Pool) {
  return drizzle(pool, { schema, mode: 'default' });
}

export async function listAdminQuestions(db: AdminDb, search?: string): Promise<AdminQuestionListItem[]> {
  const condition = search
    ? or(like(questions.question_text, `%${search}%`), like(questions.external_id, `%${search}%`))
    : undefined;

  const rows = await db
    .select({
      id: questions.id,
      topic_id: topics.id,
      topic_slug: topics.slug,
      topic_label: topics.label,
      type: questions.type,
      difficulty: questions.difficulty,
      question_text: questions.question_text,
      external_id: questions.external_id,
    })
    .from(questions)
    .innerJoin(topics, eq(questions.topic_id, topics.id))
    .where(condition)
    .orderBy(desc(questions.id));

  return rows.map((row) => ({ ...row, type: row.type as QuestionType }));
}

export async function findAdminQuestion(db: AdminDb, questionId: number): Promise<AdminQuestionDetail | null> {
  const [row] = await db
    .select({
      id: questions.id,
      topic_id: topics.id,
      topic_slug: topics.slug,
      topic_label: topics.label,
      type: questions.type,
      difficulty: questions.difficulty,
      question_text: questions.question_text,
      explanation_text: questions.explanation_text,
      external_id: questions.external_id,
    })
    .from(questions)
    .innerJoin(topics, eq(questions.topic_id, topics.id))
    .where(eq(questions.id, questionId))
    .limit(1);

  if (!row) return null;

  const options = await db
    .select({
      key: questionOptions.option_key,
      text: questionOptions.option_text,
      is_correct: questionOptions.is_correct,
    })
    .from(questionOptions)
    .where(eq(questionOptions.question_id, questionId))
    .orderBy(questionOptions.display_order);

  return { ...row, type: row.type as QuestionType, options };
}

async function topicExists(db: AdminDb, topicId: number) {
  const [topic] = await db.select({ id: topics.id }).from(topics).where(eq(topics.id, topicId)).limit(1);
  return Boolean(topic);
}

async function insertQuestion(db: InsertDb, input: AdminQuestionInput) {
  const [inserted] = await db.insert(questions).values({
    topic_id: input.topic_id,
    type: input.type,
    difficulty: input.difficulty,
    question_text: input.question_text,
    explanation_text: input.explanation_text,
    external_id: input.external_id || null,
  });

  const questionId = Number(inserted.insertId);
  await db.insert(questionOptions).values(
    input.options.map((option, index) => ({
      question_id: questionId,
      option_key: option.key,
      option_text: option.text,
      is_correct: option.is_correct,
      display_order: index + 1,
    })),
  );

  return questionId;
}

export async function createAdminQuestion(db: AdminDb, input: AdminQuestionInput): Promise<number | null> {
  if (!(await topicExists(db, input.topic_id))) return null;
  return db.transaction((tx) => insertQuestion(tx, input));
}

export async function updateAdminQuestion(
  db: AdminDb,
  questionId: number,
  input: AdminQuestionInput,
): Promise<boolean> {
  if (!(await topicExists(db, input.topic_id))) return false;

  const existing = await findAdminQuestion(db, questionId);
  if (!existing) return false;

  await db.transaction(async (tx) => {
    await tx.update(questions).set({
      topic_id: input.topic_id,
      type: input.type,
      difficulty: input.difficulty,
      question_text: input.question_text,
      explanation_text: input.explanation_text,
      external_id: input.external_id || null,
    }).where(eq(questions.id, questionId));

    await tx.delete(questionOptions).where(eq(questionOptions.question_id, questionId));
    await tx.insert(questionOptions).values(
      input.options.map((option, index) => ({
        question_id: questionId,
        option_key: option.key,
        option_text: option.text,
        is_correct: option.is_correct,
        display_order: index + 1,
      })),
    );
  });

  return true;
}

export async function deleteAdminQuestion(db: AdminDb, questionId: number): Promise<boolean> {
  const existing = await findAdminQuestion(db, questionId);
  if (!existing) return false;

  await db.transaction(async (tx) => {
    await tx.delete(questionOptions).where(eq(questionOptions.question_id, questionId));
    await tx.delete(questions).where(eq(questions.id, questionId));
  });

  return true;
}

export async function listAdminTopics(db: AdminDb) {
  return db
    .select({
      id: topics.id,
      subject_id: topics.subject_id,
      subject_label: schema.subjects.label,
      slug: topics.slug,
      label: topics.label,
      display_order: topics.display_order,
    })
    .from(topics)
    .innerJoin(schema.subjects, eq(topics.subject_id, schema.subjects.id))
    .orderBy(schema.subjects.display_order, topics.display_order);
}

interface ImportPlan {
  input: AdminQuestionInput;
  existingId: number | null;
}

export interface ImportSummary {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function importQuestionKey(question: ImportQuestion) {
  return question.external_id ? `external:${question.external_id}` : `text:${question.topic_slug}:${question.question_text}`;
}

export async function importAdminQuestions(
  db: AdminDb,
  questionsToImport: ImportQuestion[],
  mode: 'insert' | 'upsert',
  dryRun: boolean,
): Promise<ImportSummary> {
  const topicRows = await db.select({ id: topics.id, slug: topics.slug }).from(topics);
  const topicMap = new Map(topicRows.map((topic) => [topic.slug, topic.id]));
  const plans: ImportPlan[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const [index, question] of questionsToImport.entries()) {
    const key = importQuestionKey(question);
    if (seen.has(key)) {
      errors.push(`Soal ke-${index + 1} duplikat di dalam file import.`);
      continue;
    }
    seen.add(key);

    const topicId = topicMap.get(question.topic_slug);
    if (!topicId) {
      errors.push(`Soal ke-${index + 1} merujuk ke topic_slug "${question.topic_slug}" yang tidak ada.`);
      continue;
    }

    let existingId: number | null = null;
    if (question.external_id) {
      const [existing] = await db.select({ id: questions.id }).from(questions)
        .where(eq(questions.external_id, question.external_id)).limit(1);
      existingId = existing?.id ?? null;
    }

    if (!existingId) {
      const [existing] = await db.select({ id: questions.id }).from(questions)
        .where(and(eq(questions.topic_id, topicId), eq(questions.question_text, question.question_text)))
        .limit(1);
      existingId = existing?.id ?? null;
    }

    if (existingId && mode === 'insert') {
      skipped++;
      continue;
    }

    plans.push({
      existingId,
      input: {
        topic_id: topicId,
        type: question.type,
        difficulty: question.difficulty,
        external_id: question.external_id ?? null,
        question_text: question.question_text,
        explanation_text: question.explanation_text,
        options: question.options,
      },
    });
  }

  const inserted = plans.filter((plan) => plan.existingId === null).length;
  const updated = plans.filter((plan) => plan.existingId !== null).length;

  if (dryRun || errors.length > 0) {
    return { inserted, updated, skipped, errors };
  }

  await db.transaction(async (tx) => {
    for (const plan of plans) {
      if (plan.existingId === null) {
        await insertQuestion(tx, plan.input);
      } else {
        await tx.update(questions).set({
          topic_id: plan.input.topic_id,
          type: plan.input.type,
          difficulty: plan.input.difficulty,
          question_text: plan.input.question_text,
          explanation_text: plan.input.explanation_text,
          external_id: plan.input.external_id || null,
        }).where(eq(questions.id, plan.existingId));
        await tx.delete(questionOptions).where(eq(questionOptions.question_id, plan.existingId));
        await tx.insert(questionOptions).values(plan.input.options.map((option, index) => ({
          question_id: plan.existingId as number,
          option_key: option.key,
          option_text: option.text,
          is_correct: option.is_correct,
          display_order: index + 1,
        })));
      }
    }
  });

  return { inserted, updated, skipped, errors };
}
