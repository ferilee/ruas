import { and, asc, count, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { subjects } from '@/db/schema/subjects';
import { topics } from '@/db/schema/topics';
import { examAnswers } from '@/db/schema/exam-answers';
import { examAttempts } from '@/db/schema/exam-attempts';
import { examIntegrityEvents } from '@/db/schema/exam-integrity-events';
import { participantProfiles } from '@/db/schema/participant-profiles';
import { questions } from '@/db/schema/questions';
import type { Pool } from '@/db/connection';
import { users } from '@/db/schema/users';
import { canAccessTopic, getTopicAccess } from '@/services/topic-access-service';

type ExamDb = ReturnType<typeof drizzle>;

export function createExamDb(pool: Pool) {
  return drizzle(pool, { schema: { examAnswers, examAttempts, examIntegrityEvents, participantProfiles, questions, subjects, topics, users }, mode: 'default' });
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

  const [result] = await db.insert(examAttempts).values({ participant_id: participant.id, ...input });
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
