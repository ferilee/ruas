import { and, asc, count, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { examAnswers } from '@/db/schema/exam-answers';
import { examAttempts } from '@/db/schema/exam-attempts';
import { examIntegrityEvents } from '@/db/schema/exam-integrity-events';
import { participantProfiles } from '@/db/schema/participant-profiles';
import type { Pool } from '@/db/connection';

type ExamDb = ReturnType<typeof drizzle>;

export function createExamDb(pool: Pool) {
  return drizzle(pool, { schema: { examAnswers, examAttempts, examIntegrityEvents, participantProfiles }, mode: 'default' });
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

export async function createAttempt(db: ExamDb, identityKey: string, input: { subject_id: number; topic_id: number; total_questions: number }) {
  const [participant] = await db
    .select({ id: participantProfiles.id })
    .from(participantProfiles)
    .where(eq(participantProfiles.identity_key, identityKey))
    .limit(1);
  if (!participant) return null;

  const [result] = await db.insert(examAttempts).values({ participant_id: participant.id, ...input });
  return findAttempt(db, Number(result.insertId), identityKey);
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

export async function completeAttempt(db: ExamDb, attemptId: number, identityKey: string) {
  const attempt = await findAttempt(db, attemptId, identityKey);
  if (!attempt) return null;
  const answers = await db.select().from(examAnswers).where(eq(examAnswers.attempt_id, attemptId));
  const events = await db.select({ total: count() }).from(examIntegrityEvents).where(eq(examIntegrityEvents.attempt_id, attemptId));
  const correctCount = answers.filter((answer) => answer.is_correct).length;
  const totalTime = answers.reduce((total, answer) => total + answer.elapsed_seconds, 0);
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
    completed_at: new Date(),
  }).where(eq(examAttempts.id, attemptId));
  return findAttempt(db, attemptId, identityKey);
}

export async function abandonAttempt(db: ExamDb, attemptId: number, identityKey: string) {
  const attempt = await findAttempt(db, attemptId, identityKey);
  if (!attempt) return null;
  await db.update(examAttempts).set({ status: 'abandoned', completed_at: new Date() }).where(eq(examAttempts.id, attemptId));
  return findAttempt(db, attemptId, identityKey);
}
