import { and, count, countDistinct, desc, eq, inArray, isNotNull, isNull, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { examAnswers } from '@/db/schema/exam-answers';
import { questions } from '@/db/schema/questions';
import { questionOptions } from '@/db/schema/question-options';
import { topics } from '@/db/schema/topics';
import * as schema from '@/db/schema';
import type { Pool } from '@/db/connection';
import type { QuestionType } from '@/lib/scoring';
import { hashTopicToken, normalizeTopicToken } from '@/lib/topic-token';
import type { AdminQuestionInput, ImportQuestion } from '@/validators/admin-question-validator';
import type { MediaStorage } from '@/services/media-storage';
import { listQuestionMediaRecords } from '@/services/question-media-service';

type AdminDb = ReturnType<typeof drizzle>;
type InsertDb = Pick<AdminDb, 'insert'>;

export interface AdminQuestionListItem {
  id: number;
  topic_id: number;
  topic_slug: string;
  topic_label: string;
  topic_ids: number[];
  topic_labels: string[];
  type: QuestionType;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  external_id: string | null;
  archived_at: Date | null;
}

export interface AdminQuestionDetail extends AdminQuestionListItem {
  explanation_text: string;
  options: Array<{ key: string; text: string; is_correct: boolean }>;
}

export interface AdminQuestionListFilters {
  search?: string;
  topic_id?: number;
  type?: QuestionType;
  difficulty?: 'easy' | 'medium' | 'hard';
  status?: 'active' | 'archived' | 'all';
  page?: number;
  page_size?: number;
}

export interface AdminQuestionPage {
  questions: AdminQuestionListItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export function createAdminDb(pool: Pool) {
  return drizzle(pool, { schema, mode: 'default' });
}

export async function listAdminQuestions(db: AdminDb, filters: AdminQuestionListFilters = {}): Promise<AdminQuestionPage> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = [25, 50, 100].includes(filters.page_size ?? 25) ? filters.page_size ?? 25 : 25;
  const conditions = [];
  if (filters.search) {
    conditions.push(or(
      like(questions.question_text, `%${filters.search}%`),
      like(questions.external_id, `%${filters.search}%`),
      like(topics.label, `%${filters.search}%`),
      like(topics.slug, `%${filters.search}%`),
    ));
  }
  if (filters.topic_id) conditions.push(eq(schema.topicQuestions.topic_id, filters.topic_id));
  if (filters.type) conditions.push(eq(questions.type, filters.type));
  if (filters.difficulty) conditions.push(eq(questions.difficulty, filters.difficulty));
  if (filters.status !== 'all') conditions.push(filters.status === 'archived' ? isNotNull(questions.archived_at) : isNull(questions.archived_at));
  const condition = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ total: countDistinct(questions.id) })
    .from(questions)
    .innerJoin(schema.topicQuestions, and(eq(schema.topicQuestions.question_id, questions.id), eq(schema.topicQuestions.enabled, true)))
    .innerJoin(topics, eq(schema.topicQuestions.topic_id, topics.id))
    .where(condition);

  const matchingRows = await db
    .selectDistinct({ id: questions.id })
    .from(questions)
    .innerJoin(schema.topicQuestions, and(eq(schema.topicQuestions.question_id, questions.id), eq(schema.topicQuestions.enabled, true)))
    .innerJoin(topics, eq(schema.topicQuestions.topic_id, topics.id))
    .where(condition)
    .orderBy(desc(questions.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const questionIds = matchingRows.map((row) => row.id);
  const rows = questionIds.length === 0 ? [] : await db
    .select({
      id: questions.id,
      primary_topic_id: questions.topic_id,
      type: questions.type,
      difficulty: questions.difficulty,
      question_text: questions.question_text,
      external_id: questions.external_id,
      archived_at: questions.archived_at,
    })
    .from(questions)
    .where(inArray(questions.id, questionIds));
  const mappings = questionIds.length === 0 ? [] : await db
    .select({ question_id: schema.topicQuestions.question_id, topic_id: topics.id, topic_slug: topics.slug, topic_label: topics.label })
    .from(schema.topicQuestions)
    .innerJoin(topics, eq(schema.topicQuestions.topic_id, topics.id))
    .where(and(inArray(schema.topicQuestions.question_id, questionIds), eq(schema.topicQuestions.enabled, true)))
    .orderBy(schema.topicQuestions.display_order, topics.display_order, topics.id);
  const mappingsByQuestion = new Map<number, typeof mappings>();
  for (const mapping of mappings) mappingsByQuestion.set(mapping.question_id, [...(mappingsByQuestion.get(mapping.question_id) ?? []), mapping]);

  const total = Number(totalRow?.total ?? 0);
  return {
    questions: rows
      .sort((left, right) => right.id - left.id)
      .map((row) => {
        const rowMappings = mappingsByQuestion.get(row.id) ?? [];
        const primary = rowMappings.find((mapping) => mapping.topic_id === row.primary_topic_id) ?? rowMappings[0];
        return {
          id: row.id,
          topic_id: primary?.topic_id ?? row.primary_topic_id,
          topic_slug: primary?.topic_slug ?? '',
          topic_label: primary?.topic_label ?? 'Tanpa topik',
          topic_ids: rowMappings.map((mapping) => mapping.topic_id),
          topic_labels: rowMappings.map((mapping) => mapping.topic_label),
          type: row.type as QuestionType,
          difficulty: row.difficulty,
          question_text: row.question_text,
          external_id: row.external_id,
          archived_at: row.archived_at,
        };
      }),
    page,
    page_size: pageSize,
    total,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function findAdminQuestion(db: AdminDb, questionId: number): Promise<AdminQuestionDetail | null> {
  const [row] = await db
    .select({
      id: questions.id,
      topic_id: questions.topic_id,
      type: questions.type,
      difficulty: questions.difficulty,
      question_text: questions.question_text,
      explanation_text: questions.explanation_text,
      external_id: questions.external_id,
      archived_at: questions.archived_at,
    })
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);

  if (!row) return null;

  const mappings = await db
    .select({ topic_id: topics.id, topic_slug: topics.slug, topic_label: topics.label })
    .from(schema.topicQuestions)
    .innerJoin(topics, eq(schema.topicQuestions.topic_id, topics.id))
    .where(and(eq(schema.topicQuestions.question_id, questionId), eq(schema.topicQuestions.enabled, true)))
    .orderBy(schema.topicQuestions.display_order, topics.display_order, topics.id);
  const primary = mappings.find((mapping) => mapping.topic_id === row.topic_id) ?? mappings[0];
  const options = await db
    .select({
      key: questionOptions.option_key,
      text: questionOptions.option_text,
      is_correct: questionOptions.is_correct,
    })
    .from(questionOptions)
    .where(eq(questionOptions.question_id, questionId))
    .orderBy(questionOptions.display_order);

  return {
    ...row,
    topic_id: primary?.topic_id ?? row.topic_id,
    topic_slug: primary?.topic_slug ?? '',
    topic_label: primary?.topic_label ?? 'Tanpa topik',
    topic_ids: mappings.map((mapping) => mapping.topic_id),
    topic_labels: mappings.map((mapping) => mapping.topic_label),
    type: row.type as QuestionType,
    options,
  };
}

export async function setAdminQuestionArchived(db: AdminDb, questionId: number, archived: boolean): Promise<boolean> {
  const [result] = await db
    .update(questions)
    .set({ archived_at: archived ? new Date() : null })
    .where(eq(questions.id, questionId));

  return Number(result.affectedRows ?? 0) > 0;
}

async function topicsExist(db: AdminDb, topicIds: number[]) {
  if (topicIds.length === 0) return false;
  const rows = await db.select({ id: topics.id }).from(topics).where(inArray(topics.id, topicIds));
  return rows.length === topicIds.length;
}

function normalizedTopicIds(input: AdminQuestionInput) {
  return [...new Set([input.topic_id, ...(input.topic_ids ?? [])].filter((id) => Number.isInteger(id) && id > 0))];
}

async function syncQuestionTopics(db: Pick<AdminDb, 'insert' | 'delete'>, questionId: number, topicIds: number[]) {
  await db.delete(schema.topicQuestions).where(eq(schema.topicQuestions.question_id, questionId));
  await db.insert(schema.topicQuestions).values(topicIds.map((topicId, index) => ({ topic_id: topicId, question_id: questionId, enabled: true, display_order: index + 1 })));
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
  await db.insert(schema.topicQuestions).values(normalizedTopicIds(input).map((topicId, index) => ({ topic_id: topicId, question_id: questionId, enabled: true, display_order: index + 1 })));

  return questionId;
}

export async function createAdminQuestion(db: AdminDb, input: AdminQuestionInput): Promise<number | null> {
  if (!(await topicsExist(db, normalizedTopicIds(input)))) return null;
  return db.transaction((tx) => insertQuestion(tx, input));
}

export async function updateAdminQuestion(
  db: AdminDb,
  questionId: number,
  input: AdminQuestionInput,
): Promise<boolean> {
  if (!(await topicsExist(db, normalizedTopicIds(input)))) return false;

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
    await syncQuestionTopics(tx, questionId, normalizedTopicIds(input));

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

export type DeleteAdminQuestionResult = 'deleted' | 'not_found' | 'in_use';

export async function deleteAdminQuestion(db: AdminDb, questionId: number, mediaStorage: MediaStorage | null = null): Promise<DeleteAdminQuestionResult> {
  const existing = await findAdminQuestion(db, questionId);
  if (!existing) return 'not_found';

  const [answerCount] = await db
    .select({ total: count(examAnswers.id) })
    .from(examAnswers)
    .where(eq(examAnswers.question_id, questionId));

  if (Number(answerCount?.total ?? 0) > 0) return 'in_use';

  const media = mediaStorage ? await listQuestionMediaRecords(db, questionId) : [];

  await db.transaction(async (tx) => {
    await tx.delete(schema.topicQuestions).where(eq(schema.topicQuestions.question_id, questionId));
    await tx.delete(questionOptions).where(eq(questionOptions.question_id, questionId));
    await tx.delete(questions).where(eq(questions.id, questionId));
  });

  if (mediaStorage) {
    await Promise.all(media.map((item) => mediaStorage.remove(item.object_key).catch((error) => {
      console.error(`[media] Failed to remove deleted question object ${item.object_key}`, error);
    })));
  }

  return 'deleted';
}

export async function listAdminTopics(db: AdminDb) {
  const rows = await db
    .select({
      id: topics.id,
      subject_id: topics.subject_id,
      subject_label: schema.subjects.label,
      slug: topics.slug,
      label: topics.label,
      display_order: topics.display_order,
      requires_token: topics.requires_token,
      token_hash: topics.token_hash,
    })
    .from(topics)
    .innerJoin(schema.subjects, eq(topics.subject_id, schema.subjects.id))
    .orderBy(schema.subjects.display_order, topics.display_order);

  const mappings = rows.length > 0
    ? await db
      .select({ topic_id: schema.topicClasses.topic_id, class_id: schema.topicClasses.class_id, class_label: schema.educationClasses.label })
      .from(schema.topicClasses)
      .innerJoin(schema.educationClasses, eq(schema.topicClasses.class_id, schema.educationClasses.id))
      .where(inArray(schema.topicClasses.topic_id, rows.map((row) => row.id)))
    : [];
  const mappingsByTopic = new Map<number, Array<{ class_id: number; class_label: string }>>();
  for (const mapping of mappings) {
    const current = mappingsByTopic.get(mapping.topic_id) ?? [];
    current.push({ class_id: mapping.class_id, class_label: mapping.class_label });
    mappingsByTopic.set(mapping.topic_id, current);
  }

  return rows.map(({ token_hash, ...topic }) => {
    const classMappings = mappingsByTopic.get(topic.id) ?? [];
    return {
      ...topic,
      class_ids: classMappings.map((mapping) => mapping.class_id),
      class_labels: classMappings.map((mapping) => mapping.class_label),
      token_configured: Boolean(token_hash),
    };
  });
}

export interface AdminTopicInput {
  subject_id: number;
  slug: string;
  label: string;
  display_order: number;
  class_ids: number[];
}

async function subjectExists(db: AdminDb, subjectId: number) {
  const [subject] = await db.select({ id: schema.subjects.id }).from(schema.subjects).where(eq(schema.subjects.id, subjectId)).limit(1);
  return Boolean(subject);
}

async function classesExist(db: AdminDb, classIds: number[]) {
  if (classIds.length === 0) return true;
  const rows = await db
    .select({ id: schema.educationClasses.id })
    .from(schema.educationClasses)
    .where(inArray(schema.educationClasses.id, classIds));
  return rows.length === classIds.length;
}

function normalizedClassIds(classIds: number[]) {
  return [...new Set(classIds)];
}

export type CreateAdminTopicResult = number | 'invalid_subject' | 'invalid_class';

export async function createAdminTopic(db: AdminDb, input: AdminTopicInput): Promise<CreateAdminTopicResult> {
  if (!(await subjectExists(db, input.subject_id))) return 'invalid_subject';
  const classIds = normalizedClassIds(input.class_ids);
  if (!(await classesExist(db, classIds))) return 'invalid_class';
  const [result] = await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(topics).values({
      subject_id: input.subject_id,
      slug: input.slug,
      label: input.label,
      display_order: input.display_order,
    });
    if (classIds.length > 0) {
      await tx.insert(schema.topicClasses).values(classIds.map((classId) => ({ topic_id: Number(inserted.insertId), class_id: classId })));
    }
    return [inserted] as const;
  });
  return Number(result.insertId);
}

export type UpdateAdminTopicResult = 'updated' | 'not_found' | 'invalid_subject' | 'invalid_class';

export async function updateAdminTopic(db: AdminDb, topicId: number, input: AdminTopicInput): Promise<UpdateAdminTopicResult> {
  const [topic] = await db.select({ id: topics.id }).from(topics).where(eq(topics.id, topicId)).limit(1);
  if (!topic) return 'not_found';
  if (!(await subjectExists(db, input.subject_id))) return 'invalid_subject';
  const classIds = normalizedClassIds(input.class_ids);
  if (!(await classesExist(db, classIds))) return 'invalid_class';
  await db.transaction(async (tx) => {
    await tx.update(topics).set({
      subject_id: input.subject_id,
      slug: input.slug,
      label: input.label,
      display_order: input.display_order,
    }).where(eq(topics.id, topicId));
    await tx.delete(schema.topicClasses).where(eq(schema.topicClasses.topic_id, topicId));
    if (classIds.length > 0) {
      await tx.insert(schema.topicClasses).values(classIds.map((classId) => ({ topic_id: topicId, class_id: classId })));
    }
  });
  return 'updated';
}

export type DeleteAdminTopicResult = 'deleted' | 'not_found' | 'in_use';

export async function deleteAdminTopic(db: AdminDb, topicId: number): Promise<DeleteAdminTopicResult> {
  const [topic] = await db.select({ id: topics.id }).from(topics).where(eq(topics.id, topicId)).limit(1);
  if (!topic) return 'not_found';

  const [attemptCount] = await db
    .select({ total: count(schema.examAttempts.id) })
    .from(schema.examAttempts)
    .where(eq(schema.examAttempts.topic_id, topicId));
  if (Number(attemptCount?.total ?? 0) > 0) return 'in_use';

  const questionRows = await db.select({ id: questions.id }).from(questions).where(eq(questions.topic_id, topicId));
  const questionIds = questionRows.map((row) => row.id);

  await db.transaction(async (tx) => {
    if (questionIds.length > 0) await tx.delete(questionOptions).where(inArray(questionOptions.question_id, questionIds));
    if (questionIds.length > 0) await tx.delete(questions).where(inArray(questions.id, questionIds));
    await tx.delete(schema.topicClasses).where(eq(schema.topicClasses.topic_id, topicId));
    await tx.delete(topics).where(eq(topics.id, topicId));
  });

  return 'deleted';
}

export async function updateAdminTopicAccess(
  db: AdminDb,
  topicId: number,
  input: { requires_token: boolean; token?: string },
) {
  const [existing] = await db
    .select({ id: topics.id, token_hash: topics.token_hash })
    .from(topics)
    .where(eq(topics.id, topicId))
    .limit(1);
  if (!existing) return null;

  const token = input.token ? normalizeTopicToken(input.token) : '';
  const tokenHash = input.requires_token
    ? token ? hashTopicToken(token) : existing.token_hash
    : null;

  if (input.requires_token && !tokenHash) return { missingToken: true as const };

  await db.update(topics).set({ requires_token: input.requires_token, token_hash: tokenHash }).where(eq(topics.id, topicId));
  return { id: topicId, requires_token: input.requires_token, token_configured: Boolean(tokenHash) };
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
        await syncQuestionTopics(tx, plan.existingId, normalizedTopicIds(plan.input));
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
