import { asc, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { assessmentTypes } from '@/db/schema/assessment-types';
import { educationClasses } from '@/db/schema/education-classes';
import { examAnswers } from '@/db/schema/exam-answers';
import { examAttempts } from '@/db/schema/exam-attempts';
import { examIntegrityEvents } from '@/db/schema/exam-integrity-events';
import { participantProfiles } from '@/db/schema/participant-profiles';
import { questions } from '@/db/schema/questions';
import { subjects } from '@/db/schema/subjects';
import { topics } from '@/db/schema/topics';
import type { Pool } from '@/db/connection';

export type ReportStatus = 'all' | 'in_progress' | 'completed' | 'abandoned';

export interface ReportFilters {
  status: ReportStatus;
  subject_id?: number;
  class_id?: number;
  assessment_type_id?: number;
  from?: string;
  to?: string;
  search?: string;
}

type ReportDb = ReturnType<typeof drizzle>;

export function createReportDb(pool: Pool) {
  return drizzle(pool, {
    schema: {
      assessmentTypes,
      educationClasses,
      examAnswers,
      examAttempts,
      examIntegrityEvents,
      participantProfiles,
      questions,
      subjects,
      topics,
    },
    mode: 'default',
  });
}

function toIso(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function inDateRange(value: Date | string | null, from?: string, to?: string) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return false;
  if (from && timestamp < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && timestamp > new Date(`${to}T23:59:59.999`).getTime()) return false;
  return true;
}

export async function listReportAttempts(db: ReportDb, filters: ReportFilters) {
  const rows = await db
    .select({
      attempt_id: examAttempts.id,
      participant_id: participantProfiles.id,
      participant_code: participantProfiles.participant_code,
      participant_name: participantProfiles.name,
      username: participantProfiles.identity_key,
      subject_id: subjects.id,
      subject_label: subjects.label,
      class_id: educationClasses.id,
      class_label: educationClasses.label,
      assessment_type_id: assessmentTypes.id,
      assessment_type_label: assessmentTypes.label,
      topic_id: topics.id,
      topic_label: topics.label,
      status: examAttempts.status,
      total_questions: examAttempts.total_questions,
      answered_questions: examAttempts.answered_questions,
      correct_count: examAttempts.correct_count,
      incorrect_count: examAttempts.incorrect_count,
      total_time_seconds: examAttempts.total_time_seconds,
      accuracy: examAttempts.accuracy,
      violation_count: examAttempts.violation_count,
      integrity_penalty: examAttempts.integrity_penalty,
      final_score: examAttempts.final_score,
      started_at: examAttempts.started_at,
      completed_at: examAttempts.completed_at,
    })
    .from(examAttempts)
    .innerJoin(participantProfiles, eq(examAttempts.participant_id, participantProfiles.id))
    .innerJoin(subjects, eq(examAttempts.subject_id, subjects.id))
    .leftJoin(topics, eq(examAttempts.topic_id, topics.id))
    .leftJoin(educationClasses, eq(subjects.class_id, educationClasses.id))
    .leftJoin(assessmentTypes, eq(subjects.assessment_type_id, assessmentTypes.id))
    .orderBy(desc(examAttempts.started_at), desc(examAttempts.id));

  const search = filters.search?.trim().toLowerCase();
  return rows
    .filter((row) => filters.status === 'all' || row.status === filters.status)
    .filter((row) => !filters.subject_id || row.subject_id === filters.subject_id)
    .filter((row) => !filters.class_id || row.class_id === filters.class_id)
    .filter((row) => !filters.assessment_type_id || row.assessment_type_id === filters.assessment_type_id)
    .filter((row) => inDateRange(row.started_at, filters.from, filters.to))
    .filter((row) => {
      if (!search) return true;
      return [row.participant_code, row.participant_name, row.username, row.subject_label, row.topic_label ?? '']
        .some((value) => value.toLowerCase().includes(search));
    })
    .map((row) => ({ ...row, started_at: toIso(row.started_at), completed_at: toIso(row.completed_at) }));
}

export async function getReportDetail(db: ReportDb, attemptId: number) {
  const rows = await listReportAttempts(db, { status: 'all' });
  const attempt = rows.find((row) => row.attempt_id === attemptId);
  if (!attempt) return null;

  const [answers, events] = await Promise.all([
    db
      .select({
        id: examAnswers.id,
        attempt_id: examAnswers.attempt_id,
        question_id: examAnswers.question_id,
        question_text: questions.question_text,
        selected_keys: examAnswers.selected_keys,
        is_correct: examAnswers.is_correct,
        elapsed_seconds: examAnswers.elapsed_seconds,
        answered_at: examAnswers.answered_at,
      })
      .from(examAnswers)
      .innerJoin(questions, eq(examAnswers.question_id, questions.id))
      .where(eq(examAnswers.attempt_id, attemptId))
      .orderBy(asc(examAnswers.id)),
    db
      .select()
      .from(examIntegrityEvents)
      .where(eq(examIntegrityEvents.attempt_id, attemptId))
      .orderBy(asc(examIntegrityEvents.occurred_at), asc(examIntegrityEvents.id)),
  ]);

  return {
    ...attempt,
    answers: answers.map((answer) => ({ ...answer, answered_at: toIso(answer.answered_at) })),
    integrity_events: events.map((event) => ({ ...event, occurred_at: toIso(event.occurred_at) })),
  };
}

export function summarizeReport(rows: Awaited<ReturnType<typeof listReportAttempts>>) {
  const completed = rows.filter((row) => row.status === 'completed');
  const average = (values: number[]) => values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;
  return {
    total_attempts: rows.length,
    completed_attempts: completed.length,
    in_progress_attempts: rows.filter((row) => row.status === 'in_progress').length,
    abandoned_attempts: rows.filter((row) => row.status === 'abandoned').length,
    average_score: average(completed.map((row) => row.final_score)),
    average_accuracy: average(completed.map((row) => row.accuracy)),
    average_time_seconds: Math.round(average(completed.map((row) => row.total_time_seconds))),
    total_violations: completed.reduce((total, row) => total + row.violation_count, 0),
  };
}
