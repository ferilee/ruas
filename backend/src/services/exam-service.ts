import { and, asc, count, eq, inArray, lte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { randomInt } from 'node:crypto';
import { subjects } from '@/db/schema/subjects';
import { topics } from '@/db/schema/topics';
import { examAnswers } from '@/db/schema/exam-answers';
import { examAttempts } from '@/db/schema/exam-attempts';
import { examIntegrityEvents } from '@/db/schema/exam-integrity-events';
import { participantProfiles } from '@/db/schema/participant-profiles';
import { questions } from '@/db/schema/questions';
import { questionOptions } from '@/db/schema/question-options';
import type { Pool } from '@/db/connection';
import { users } from '@/db/schema/users';
import { canAccessTopic, getTopicAccess } from '@/services/topic-access-service';
import { publishRealtimeEvent } from '@/lib/realtime-events';

type ExamDb = ReturnType<typeof drizzle>;
let expiryRun: Promise<number> | null = null;

export function createExamDb(pool: Pool) {
  return drizzle(pool, { schema: { examAnswers, examAttempts, examIntegrityEvents, participantProfiles, questionOptions, questions, subjects, topics, users }, mode: 'default' });
}

export interface ExamSettings {
  show_correct_answer_on_wrong: boolean;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  duration_minutes: number;
  minimum_duration_minutes: number;
}

interface AttemptOrder {
  question_order: number[];
  option_order: Record<string, string[]>;
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex] as T, result[index] as T];
  }
  return result;
}

export async function getSubjectExamSettings(db: ExamDb, subjectId: number): Promise<ExamSettings> {
  const [row] = await db
    .select({
      show_correct_answer_on_wrong: subjects.show_correct_answer_on_wrong,
      shuffle_questions: subjects.shuffle_questions,
      shuffle_options: subjects.shuffle_options,
      duration_minutes: subjects.duration_minutes,
      minimum_duration_minutes: subjects.minimum_duration_minutes,
    })
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .limit(1);

  return {
    show_correct_answer_on_wrong: Boolean(row?.show_correct_answer_on_wrong),
    shuffle_questions: Boolean(row?.shuffle_questions),
    shuffle_options: Boolean(row?.shuffle_options),
    duration_minutes: Number(row?.duration_minutes ?? 0),
    minimum_duration_minutes: Number(row?.minimum_duration_minutes ?? 0),
  };
}

export function isAttemptExpired(attempt: typeof examAttempts.$inferSelect, now = new Date()) {
  return Boolean(attempt.deadline_at && new Date(attempt.deadline_at).getTime() <= now.getTime());
}

export function expireOverdueAttempts(db: ExamDb, now = new Date()) {
  if (expiryRun) return expiryRun;

  expiryRun = (async () => {
    const overdueAttempts = await db
      .select({ id: examAttempts.id, identity_key: participantProfiles.identity_key })
      .from(examAttempts)
      .innerJoin(participantProfiles, eq(examAttempts.participant_id, participantProfiles.id))
      .where(and(eq(examAttempts.status, 'in_progress'), lte(examAttempts.deadline_at, now)));

    let completedCount = 0;
    for (const overdue of overdueAttempts) {
      const completed = await completeAttempt(db, overdue.id, overdue.identity_key, { force: true });
      if (completed && 'status' in completed && completed.status === 'completed') {
        completedCount += 1;
        publishRealtimeEvent({ resource: 'attempts', method: 'SYSTEM', path: `/api/exam/attempts/${overdue.id}/expire` });
      }
    }
    return completedCount;
  })().finally(() => {
    expiryRun = null;
  });

  return expiryRun;
}

async function buildAttemptOrder(db: ExamDb, topicId: number, settings: ExamSettings): Promise<AttemptOrder> {
  const questionRows = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.topic_id, topicId))
    .orderBy(asc(questions.id));
  const questionOrder = settings.shuffle_questions ? shuffle(questionRows.map((row) => row.id)) : questionRows.map((row) => row.id);
  const optionOrder: Record<string, string[]> = {};

  if (questionOrder.length > 0) {
    const optionRows = await db
      .select({ question_id: questionOptions.question_id, key: questionOptions.option_key })
      .from(questionOptions)
      .where(inArray(questionOptions.question_id, questionOrder))
      .orderBy(asc(questionOptions.display_order));

    for (const questionId of questionOrder) {
      const keys = optionRows.filter((row) => row.question_id === questionId).map((row) => row.key);
      optionOrder[String(questionId)] = settings.shuffle_options ? shuffle(keys) : keys;
    }
  }

  return { question_order: questionOrder, option_order: optionOrder };
}

async function ensureAttemptOrder(db: ExamDb, attempt: typeof examAttempts.$inferSelect): Promise<AttemptOrder> {
  if (Array.isArray(attempt.question_order) && attempt.option_order && typeof attempt.option_order === 'object') {
    return { question_order: attempt.question_order, option_order: attempt.option_order };
  }

  const settings = await getSubjectExamSettings(db, attempt.subject_id);
  const order = await buildAttemptOrder(db, attempt.topic_id, settings);
  await db.update(examAttempts).set(order).where(eq(examAttempts.id, attempt.id));
  return order;
}

export async function getQuestionExplanationMode(db: ExamDb, questionId: number) {
  const [row] = await db
    .select({ explanation_mode: subjects.explanation_mode })
    .from(questions)
    .innerJoin(topics, eq(questions.topic_id, topics.id))
    .innerJoin(subjects, eq(topics.subject_id, subjects.id))
    .where(eq(questions.id, questionId))
    .limit(1);

  return row?.explanation_mode ?? 'hidden';
}

export async function getNextAttemptQuestion(db: ExamDb, attemptId: number, identityKey: string) {
  const attempt = await findAttempt(db, attemptId, identityKey);
  if (!attempt) return null;
  if (isAttemptExpired(attempt)) {
    await completeAttempt(db, attemptId, identityKey);
    return { question: null };
  }

  const order = await ensureAttemptOrder(db, attempt);
  const answers = await db.select({ question_id: examAnswers.question_id }).from(examAnswers).where(eq(examAnswers.attempt_id, attemptId));
  const answeredIds = new Set(answers.map((answer) => answer.question_id));
  const nextQuestionId = order.question_order.find((questionId) => !answeredIds.has(questionId));
  if (!nextQuestionId) return { question: null };

  const [question] = await db
    .select({ id: questions.id, type: questions.type, difficulty: questions.difficulty, question_text: questions.question_text })
    .from(questions)
    .where(eq(questions.id, nextQuestionId))
    .limit(1);
  if (!question) return { question: null };

  const optionRows = await db
    .select({ key: questionOptions.option_key, text: questionOptions.option_text, display_order: questionOptions.display_order })
    .from(questionOptions)
    .where(eq(questionOptions.question_id, nextQuestionId))
    .orderBy(asc(questionOptions.display_order));
  const optionPosition = new Map((order.option_order[String(nextQuestionId)] ?? []).map((key, index) => [key, index]));
  const options = optionRows
    .sort((left, right) => (optionPosition.get(left.key) ?? left.display_order) - (optionPosition.get(right.key) ?? right.display_order))
    .map(({ key, text }) => ({ key, text }));

  return { question: { ...question, options } };
}

async function findAssignedSubjectId(db: ExamDb, identityKey: string, profileSubjectId: number) {
  const [account] = await db
    .select({ subject_id: users.subject_id })
    .from(users)
    .where(eq(users.username, identityKey))
    .limit(1);

  return account ? account.subject_id : profileSubjectId;
}

export async function getAttemptAvailability(db: ExamDb, identityKey: string, subjectId: number, topicId: number) {
  const [participant] = await db
    .select({ id: participantProfiles.id })
    .from(participantProfiles)
    .where(eq(participantProfiles.identity_key, identityKey))
    .limit(1);
  if (!participant) return null;

  const [profile] = await db
    .select({ subject_id: participantProfiles.subject_id })
    .from(participantProfiles)
    .where(eq(participantProfiles.identity_key, identityKey))
    .limit(1);
  const assignedSubjectId = profile ? await findAssignedSubjectId(db, identityKey, profile.subject_id) : null;
  if (!assignedSubjectId || assignedSubjectId !== subjectId) return null;

  const [subject] = await db
    .select({ id: subjects.id, max_attempts: subjects.max_attempts })
    .from(subjects)
    .innerJoin(topics, eq(topics.subject_id, subjects.id))
    .where(and(eq(subjects.id, subjectId), eq(topics.id, topicId)))
    .limit(1);
  if (!subject) return null;

  const [attemptCount] = await db
    .select({ total: count() })
    .from(examAttempts)
    .where(and(eq(examAttempts.participant_id, participant.id), eq(examAttempts.topic_id, topicId)));
  const attemptsUsed = Number(attemptCount?.total ?? 0);
  const [activeAttempt] = await db
    .select({ id: examAttempts.id })
    .from(examAttempts)
    .where(and(eq(examAttempts.participant_id, participant.id), eq(examAttempts.topic_id, topicId), eq(examAttempts.status, 'in_progress')))
    .orderBy(asc(examAttempts.started_at))
    .limit(1);

  return {
    max_attempts: subject.max_attempts,
    attempts_used: attemptsUsed,
    remaining_attempts: subject.max_attempts === 0 ? null : Math.max(0, subject.max_attempts - attemptsUsed),
    can_start: subject.max_attempts === 0 || attemptsUsed < subject.max_attempts,
    has_active_attempt: Boolean(activeAttempt),
  };
}

export async function findAttempt(db: ExamDb, attemptId: number, identityKey: string) {
  const [attempt] = await db
    .select({ attempt: examAttempts })
    .from(examAttempts)
    .innerJoin(participantProfiles, eq(examAttempts.participant_id, participantProfiles.id))
    .where(and(eq(examAttempts.id, attemptId), eq(participantProfiles.identity_key, identityKey)))
    .limit(1);
  return attempt?.attempt ?? null;
}

export async function findActiveAttempt(db: ExamDb, topicId: number, identityKey: string) {
  const [attempt] = await db
    .select({ attempt: examAttempts })
    .from(examAttempts)
    .innerJoin(participantProfiles, eq(examAttempts.participant_id, participantProfiles.id))
    .where(and(eq(examAttempts.topic_id, topicId), eq(examAttempts.status, 'in_progress'), eq(participantProfiles.identity_key, identityKey)))
    .orderBy(asc(examAttempts.started_at))
    .limit(1);
  return attempt?.attempt ?? null;
}

export async function findAttemptAnswers(db: ExamDb, attemptId: number, identityKey: string) {
  const attempt = await findAttempt(db, attemptId, identityKey);
  if (!attempt) return null;
  return db.select().from(examAnswers).where(eq(examAnswers.attempt_id, attemptId)).orderBy(asc(examAnswers.id));
}

export async function getExamReview(db: ExamDb, attemptId: number, identityKey: string) {
  const attempt = await findAttempt(db, attemptId, identityKey);
  if (!attempt) return null;

  const [subject] = await db
    .select({ explanation_mode: subjects.explanation_mode })
    .from(subjects)
    .where(eq(subjects.id, attempt.subject_id))
    .limit(1);
  const mode = subject?.explanation_mode ?? 'hidden';
  if (mode !== 'after_exam' || attempt.status !== 'completed') return { mode, items: [] };

  const rows = await db
    .select({
      question_id: examAnswers.question_id,
      question_text: questions.question_text,
      explanation: questions.explanation_text,
      is_correct: examAnswers.is_correct,
      elapsed_seconds: examAnswers.elapsed_seconds,
    })
    .from(examAnswers)
    .innerJoin(questions, eq(examAnswers.question_id, questions.id))
    .where(eq(examAnswers.attempt_id, attemptId))
    .orderBy(asc(examAnswers.id));

  return { mode, items: rows };
}

export async function createAttempt(
  db: ExamDb,
  identityKey: string,
  input: { subject_id: number; topic_id: number; total_questions: number; topic_access_token?: string },
) {
  const [participant] = await db
    .select({ id: participantProfiles.id, subject_id: participantProfiles.subject_id })
    .from(participantProfiles)
    .where(eq(participantProfiles.identity_key, identityKey))
    .limit(1);
  if (!participant) return null;

  const assignedSubjectId = await findAssignedSubjectId(db, identityKey, participant.subject_id);
  if (!assignedSubjectId || assignedSubjectId !== input.subject_id) return { assignmentMismatch: true as const };

  const topicAccess = await getTopicAccess(db, input.topic_id);
  if (!topicAccess) return null;
  if (!canAccessTopic(topicAccess, input.topic_access_token)) return { tokenRequired: true as const };

  const availability = await getAttemptAvailability(db, identityKey, input.subject_id, input.topic_id);
  if (!availability) return null;
  if (!availability.can_start) return { limited: true as const, availability };

  const subjectSettings = await getSubjectExamSettings(db, input.subject_id);
  const order = await buildAttemptOrder(db, input.topic_id, subjectSettings);
  const startedAt = new Date();
  const deadlineAt = subjectSettings.duration_minutes > 0
    ? new Date(startedAt.getTime() + subjectSettings.duration_minutes * 60_000)
    : null;
  const [result] = await db.insert(examAttempts).values({
    participant_id: participant.id,
    subject_id: input.subject_id,
    topic_id: input.topic_id,
    total_questions: input.total_questions,
    question_order: order.question_order,
    option_order: order.option_order,
    started_at: startedAt,
    deadline_at: deadlineAt,
    minimum_duration_minutes: subjectSettings.minimum_duration_minutes,
  });
  return { limited: false as const, attempt: await findAttempt(db, Number(result.insertId), identityKey) };
}

export async function saveAnswer(db: ExamDb, attemptId: number, input: { question_id: number; selected_keys: string[]; is_correct: boolean; elapsed_seconds: number }) {
  const [existing] = await db
    .select({ id: examAnswers.id })
    .from(examAnswers)
    .where(and(eq(examAnswers.attempt_id, attemptId), eq(examAnswers.question_id, input.question_id)))
    .limit(1);

  if (existing) {
    await db.update(examAnswers).set({ ...input, selected_keys: input.selected_keys, answered_at: new Date() }).where(eq(examAnswers.id, existing.id));
  } else {
    await db.insert(examAnswers).values({ attempt_id: attemptId, ...input, selected_keys: input.selected_keys });
  }
}

export async function saveIntegrityEvent(db: ExamDb, attemptId: number, eventType: string, occurredAt: Date) {
  await db.insert(examIntegrityEvents).values({ attempt_id: attemptId, event_type: eventType, occurred_at: occurredAt });
}

export async function completeAttempt(db: ExamDb, attemptId: number, identityKey: string, options: { force?: boolean } = {}) {
  const attempt = await findAttempt(db, attemptId, identityKey);
  if (!attempt) return null;
  if (attempt.status !== 'in_progress') return attempt;
  const answerRows = await db.select().from(examAnswers).where(eq(examAnswers.attempt_id, attemptId));
  const answersByQuestion = new Map<number, (typeof answerRows)[number]>();
  for (const answer of answerRows) answersByQuestion.set(answer.question_id, answer);
  const answers = [...answersByQuestion.values()];
  const events = await db.select({ total: count() }).from(examIntegrityEvents).where(eq(examIntegrityEvents.attempt_id, attemptId));
  const correctCount = answers.filter((answer) => answer.is_correct).length;
  const completedAt = new Date();
  const totalTime = Math.max(0, Math.floor((completedAt.getTime() - new Date(attempt.started_at).getTime()) / 1000));
  const minimumTime = Math.max(0, attempt.minimum_duration_minutes * 60);
  const deadlineReached = isAttemptExpired(attempt, completedAt);
  if (!options.force && !deadlineReached && totalTime < minimumTime) {
    return { blocked: true as const, minimum_duration_seconds: minimumTime, elapsed_seconds: totalTime };
  }
  const accuracy = answers.length ? Math.round((correctCount / answers.length) * 100) : 0;
  const violationCount = Number(events[0]?.total ?? 0);
  await db.update(examAttempts).set({
    status: 'completed',
    answered_questions: answers.length,
    correct_count: correctCount,
    incorrect_count: answers.length - correctCount,
    total_time_seconds: totalTime,
    accuracy,
    violation_count: violationCount,
    final_score: accuracy,
    completed_at: completedAt,
  }).where(eq(examAttempts.id, attemptId));
  return findAttempt(db, attemptId, identityKey);
}

export async function abandonAttempt(db: ExamDb, attemptId: number, identityKey: string) {
  const attempt = await findAttempt(db, attemptId, identityKey);
  if (!attempt) return null;
  await db.update(examAttempts).set({ status: 'abandoned', completed_at: new Date() }).where(eq(examAttempts.id, attemptId));
  return findAttempt(db, attemptId, identityKey);
}
