import { asc, desc, eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { drizzle } from 'drizzle-orm/mysql2';
import { assessmentTypes } from '@/db/schema/assessment-types';
import { educationClasses } from '@/db/schema/education-classes';
import { examAnswers } from '@/db/schema/exam-answers';
import { examAttempts } from '@/db/schema/exam-attempts';
import { examIntegrityEvents } from '@/db/schema/exam-integrity-events';
import { participantProfiles } from '@/db/schema/participant-profiles';
import { questions } from '@/db/schema/questions';
import { questionOptions } from '@/db/schema/question-options';
import { subjects } from '@/db/schema/subjects';
import { topics } from '@/db/schema/topics';
import { users } from '@/db/schema/users';
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
const userClasses = alias(educationClasses, 'user_classes');
const subjectClasses = alias(educationClasses, 'subject_classes');

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
      questionOptions,
      subjects,
      topics,
      users,
    },
    mode: 'default',
  });
}

export async function countReportAttempts(db: ReportDb) {
  const rows = await db.select({ id: examAttempts.id }).from(examAttempts);
  return rows.length;
}

export async function resetAllReportData(db: ReportDb) {
  return db.transaction(async (tx) => {
    const attempts = await tx.select({ id: examAttempts.id }).from(examAttempts);
    const attemptIds = attempts.map((attempt) => attempt.id);
    if (attemptIds.length === 0) return 0;

    await tx.delete(examIntegrityEvents).where(inArray(examIntegrityEvents.attempt_id, attemptIds));
    await tx.delete(examAnswers).where(inArray(examAnswers.attempt_id, attemptIds));
    await tx.delete(examAttempts).where(inArray(examAttempts.id, attemptIds));
    return attemptIds.length;
  });
}

function toIso(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function parseQuestionOrder(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0);
  }
  if (typeof value === 'string') {
    try {
      return parseQuestionOrder(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
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
      user_class_id: users.class_id,
      user_class_label: userClasses.label,
      subject_id: subjects.id,
      subject_label: subjects.label,
      subject_class_id: subjectClasses.id,
      subject_class_label: subjectClasses.label,
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
      question_order: examAttempts.question_order,
      started_at: examAttempts.started_at,
      completed_at: examAttempts.completed_at,
    })
    .from(examAttempts)
    .innerJoin(participantProfiles, eq(examAttempts.participant_id, participantProfiles.id))
    .leftJoin(users, eq(users.username, participantProfiles.identity_key))
    .innerJoin(subjects, eq(examAttempts.subject_id, subjects.id))
    .leftJoin(topics, eq(examAttempts.topic_id, topics.id))
    .leftJoin(userClasses, eq(users.class_id, userClasses.id))
    .leftJoin(subjectClasses, eq(subjects.class_id, subjectClasses.id))
    .leftJoin(assessmentTypes, eq(subjects.assessment_type_id, assessmentTypes.id))
    .orderBy(desc(examAttempts.started_at), desc(examAttempts.id));

  const normalizedRows = rows.map(({ user_class_id, user_class_label, subject_class_id, subject_class_label, ...row }) => ({
    ...row,
    class_id: user_class_id ?? subject_class_id,
    class_label: user_class_label ?? subject_class_label,
  }));
  const search = filters.search?.trim().toLowerCase();
  return normalizedRows
    .filter((row) => filters.status === 'all' || row.status === filters.status)
    .filter((row) => !filters.subject_id || row.subject_id === filters.subject_id)
    .filter((row) => !filters.class_id || row.class_id === filters.class_id)
    .filter((row) => !filters.assessment_type_id || row.assessment_type_id === filters.assessment_type_id)
    .filter((row) => inDateRange(row.started_at, filters.from, filters.to))
    .filter((row) => {
      if (!search) return true;
      return [row.participant_code, row.participant_name, row.username, row.class_label ?? '', row.subject_label, row.topic_label ?? '']
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

  const storedQuestionOrder = parseQuestionOrder(attempt.question_order);
  const answeredQuestionIds = answers.map((answer) => answer.question_id);
  const orderedQuestionIds = storedQuestionOrder.length ? storedQuestionOrder : answeredQuestionIds;
  const questionRows = orderedQuestionIds.length
    ? await db.select({ id: questions.id, topic_id: questions.topic_id, topic_label: topics.label, question_text: questions.question_text })
      .from(questions)
      .innerJoin(topics, eq(questions.topic_id, topics.id))
      .where(inArray(questions.id, orderedQuestionIds))
    : [];

  const questionIds = questionRows.map((question) => question.id);
  const optionRows = questionIds.length
    ? await db.select({ question_id: questionOptions.question_id, option_key: questionOptions.option_key, option_text: questionOptions.option_text, is_correct: questionOptions.is_correct })
      .from(questionOptions)
      .where(inArray(questionOptions.question_id, questionIds))
    : [];
  const questionById = new Map(questionRows.map((question) => [question.id, question]));
  const optionsByQuestion = new Map<number, typeof optionRows>();
  for (const option of optionRows) {
    const options = optionsByQuestion.get(option.question_id) ?? [];
    options.push(option);
    optionsByQuestion.set(option.question_id, options);
  }
  const answerByQuestion = new Map(answers.map((answer) => [answer.question_id, answer]));
  const questionAnalysis = orderedQuestionIds.map((questionId, index) => {
    const question = questionById.get(questionId);
    const answer = answerByQuestion.get(questionId);
    const options = optionsByQuestion.get(questionId) ?? [];
    const selectedKeys = Array.isArray(answer?.selected_keys) ? answer.selected_keys as string[] : [];
    const correctKeys = options.filter((option) => option.is_correct).map((option) => option.option_key);
    const status = answer ? (answer.is_correct ? 'correct' : 'incorrect') : 'unanswered';
    return {
      question_number: index + 1,
      question_id: questionId,
      topic_label: question?.topic_label ?? attempt.topic_label ?? 'Topik',
      question_text: question?.question_text ?? answer?.question_text ?? 'Soal tidak tersedia',
      selected_keys: selectedKeys,
      selected_texts: options.filter((option) => selectedKeys.includes(option.option_key)).map((option) => option.option_text),
      correct_keys: correctKeys,
      correct_texts: options.filter((option) => option.is_correct).map((option) => option.option_text),
      status,
      is_correct: answer?.is_correct ?? false,
      elapsed_seconds: answer?.elapsed_seconds ?? 0,
      answered_at: answer ? toIso(answer.answered_at) : null,
    };
  });

  return {
    ...attempt,
    answers: answers.map((answer) => ({ ...answer, answered_at: toIso(answer.answered_at) })),
    integrity_events: events.map((event) => ({ ...event, occurred_at: toIso(event.occurred_at) })),
    question_analysis: questionAnalysis,
    correct_question_numbers: questionAnalysis.filter((question) => question.status === 'correct').map((question) => question.question_number),
    incorrect_question_numbers: questionAnalysis.filter((question) => question.status === 'incorrect').map((question) => question.question_number),
    unanswered_question_numbers: questionAnalysis.filter((question) => question.status === 'unanswered').map((question) => question.question_number),
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

export function summarizeReportByClass(rows: Awaited<ReturnType<typeof listReportAttempts>>) {
  const groups = new Map<string, {
    class_id: number | null;
    class_label: string;
    rows: typeof rows;
  }>();

  for (const row of rows) {
    const key = row.class_id === null ? 'none' : String(row.class_id);
    const group = groups.get(key) ?? {
      class_id: row.class_id,
      class_label: row.class_label ?? 'Tanpa kelas',
      rows: [],
    };
    group.rows.push(row);
    groups.set(key, group);
  }

  const average = (values: number[]) => values.length
    ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
    : 0;

  return [...groups.values()]
    .sort((first, second) => first.class_label.localeCompare(second.class_label, 'id'))
    .map(({ class_id, class_label, rows: classRows }) => {
      const completed = classRows.filter((row) => row.status === 'completed');
      const participants = new Set(classRows.map((row) => row.participant_id));
      return {
        class_id,
        class_label,
        participant_count: participants.size,
        total_attempts: classRows.length,
        completed_attempts: completed.length,
        average_score: average(completed.map((row) => row.final_score)),
        average_accuracy: average(completed.map((row) => row.accuracy)),
        average_time_seconds: Math.round(average(completed.map((row) => row.total_time_seconds))),
        total_violations: completed.reduce((total, row) => total + row.violation_count, 0),
      };
    });
}
