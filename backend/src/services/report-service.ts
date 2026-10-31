import { asc, desc, eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { drizzle } from 'drizzle-orm/mysql2';
import { assessmentSchedule } from '@/db/schema/assessment-schedule';
import { assessmentScheduleParticipants } from '@/db/schema/assessment-schedule-participants';
import { assessmentTypes } from '@/db/schema/assessment-types';
import { educationClasses } from '@/db/schema/education-classes';
import { examAnswers } from '@/db/schema/exam-answers';
import { examAttempts } from '@/db/schema/exam-attempts';
import { examIntegrityEvents } from '@/db/schema/exam-integrity-events';
import { participantProfiles } from '@/db/schema/participant-profiles';
import { questions } from '@/db/schema/questions';
import { questionOptions } from '@/db/schema/question-options';
import { subjects } from '@/db/schema/subjects';
import { topicClasses } from '@/db/schema/topic-classes';
import { topics } from '@/db/schema/topics';
import { users } from '@/db/schema/users';
import type { Pool } from '@/db/connection';

export type ReportStatus = 'all' | 'in_progress' | 'completed' | 'abandoned';
export type ReportScorePolicy = 'best' | 'latest' | 'average';

export interface ReportFilters {
  status: ReportStatus;
  score_policy?: ReportScorePolicy;
  subject_id?: number;
  topic_id?: number;
  class_id?: number;
  assessment_type_id?: number;
  from?: string;
  to?: string;
  search?: string;
  scope_subject_id?: number;
  scope_class_id?: number | null;
  scope_class_ids?: number[];
  scope_owner_username?: string;
}

// Baris laporan berada dalam scope kelas guru bila kelasnya termasuk salah
// satu kelas petaan guru. scope_class_ids (multi-kelas) didahulukan;
// scope_class_id tunggal lama tetap didukung untuk kompatibilitas.
function reportRowInClassScope(filters: ReportFilters, classId: number | null) {
  if (filters.scope_class_ids !== undefined) {
    return filters.scope_class_ids.length === 0 || classId === null || filters.scope_class_ids.includes(classId);
  }
  return !filters.scope_class_id || classId === null || classId === filters.scope_class_id;
}

type ReportDb = ReturnType<typeof drizzle>;
const userClasses = alias(educationClasses, 'user_classes');
const subjectClasses = alias(educationClasses, 'subject_classes');

export function createReportDb(pool: Pool) {
  return drizzle(pool, {
    schema: {
      assessmentSchedule,
      assessmentScheduleParticipants,
      assessmentTypes,
      educationClasses,
      examAnswers,
      examAttempts,
      examIntegrityEvents,
      participantProfiles,
      questions,
      questionOptions,
      subjects,
      topicClasses,
      topics,
      users,
    },
    mode: 'default',
  });
}

export async function countReportAttempts(db: ReportDb) {
  const rows = await db
    .select({ id: examAttempts.id })
    .from(examAttempts)
    .innerJoin(participantProfiles, eq(examAttempts.participant_id, participantProfiles.id))
    .where(eq(participantProfiles.is_demo, 0));
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

export function normalizeSelectedKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  if (typeof value !== 'string' || value.trim().length === 0) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? normalizeSelectedKeys(parsed) : typeof parsed === 'string' ? [parsed] : [];
  } catch {
    return [value.trim()];
  }
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
      subject_created_by: subjects.created_by,
      subject_class_created_by: subjectClasses.created_by,
      topic_created_by: topics.created_by,
      participant_created_by: users.created_by,
      user_class_created_by: userClasses.created_by,
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
    .where(eq(participantProfiles.is_demo, 0))
    .orderBy(desc(examAttempts.started_at), desc(examAttempts.id));

  const normalizedRows = rows.map(({ user_class_id, user_class_label, subject_class_id, subject_class_label, subject_class_created_by, user_class_created_by, ...row }) => ({
    ...row,
    class_id: user_class_id ?? subject_class_id,
    class_label: user_class_label ?? subject_class_label,
    class_created_by: user_class_created_by ?? subject_class_created_by,
  }));
  const search = filters.search?.trim().toLowerCase();
  return normalizedRows
    .filter((row) => filters.status === 'all' || row.status === filters.status)
    .filter((row) => !filters.subject_id || row.subject_id === filters.subject_id)
    .filter((row) => {
      if (!filters.scope_owner_username) return (!filters.scope_subject_id || row.subject_id === filters.scope_subject_id)
        && reportRowInClassScope(filters, row.class_id);
      const owned = row.subject_created_by === filters.scope_owner_username
        || row.class_created_by === filters.scope_owner_username
        || row.topic_created_by === filters.scope_owner_username
        || row.participant_created_by === filters.scope_owner_username;
      const assigned = (!filters.scope_subject_id || row.subject_id === filters.scope_subject_id)
        && reportRowInClassScope(filters, row.class_id);
      return owned || assigned;
    })
    .filter((row) => !filters.topic_id || row.topic_id === filters.topic_id)
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
  const uniqueAnswersByQuestion = new Map<number, (typeof answers)[number]>();
  for (const answer of answers) uniqueAnswersByQuestion.set(answer.question_id, answer);
  const uniqueAnswers = [...uniqueAnswersByQuestion.values()];
  const answeredQuestionIds = uniqueAnswers.map((answer) => answer.question_id);
  const orderedQuestionIds = storedQuestionOrder.length ? storedQuestionOrder : answeredQuestionIds;
  const questionRows = orderedQuestionIds.length
    ? await db.select({ id: questions.id, question_text: questions.question_text })
      .from(questions)
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
  const answerByQuestion = new Map(uniqueAnswers.map((answer) => [answer.question_id, answer]));
  const questionAnalysis = orderedQuestionIds.map((questionId, index) => {
    const question = questionById.get(questionId);
    const answer = answerByQuestion.get(questionId);
    const options = optionsByQuestion.get(questionId) ?? [];
    const selectedKeys = normalizeSelectedKeys(answer?.selected_keys);
    const correctKeys = options.filter((option) => option.is_correct).map((option) => option.option_key);
    const status = answer ? (answer.is_correct ? 'correct' : 'incorrect') : 'unanswered';
    return {
      question_number: index + 1,
      question_id: questionId,
      topic_label: attempt.topic_label ?? 'Topik',
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
    answers: uniqueAnswers.map((answer) => ({ ...answer, selected_keys: normalizeSelectedKeys(answer.selected_keys), answered_at: toIso(answer.answered_at) })),
    integrity_events: events.map((event) => ({ ...event, occurred_at: toIso(event.occurred_at) })),
    question_analysis: questionAnalysis,
    correct_question_numbers: questionAnalysis.filter((question) => question.status === 'correct').map((question) => question.question_number),
    incorrect_question_numbers: questionAnalysis.filter((question) => question.status === 'incorrect').map((question) => question.question_number),
    unanswered_question_numbers: questionAnalysis.filter((question) => question.status === 'unanswered').map((question) => question.question_number),
  };
}

type ReportRow = Awaited<ReturnType<typeof listReportAttempts>>[number];

export interface QuestionStatisticAnswer {
  question_id: number;
  question_text: string;
  topic_label: string;
  is_correct: boolean;
  elapsed_seconds: number;
}

export interface QuestionStatistic {
  question_id: number;
  question_text: string;
  topic_label: string;
  answered_count: number;
  correct_count: number;
  correct_percent: number;
  average_time_seconds: number;
  difficulty_label: 'Terkuasai' | 'Cukup' | 'Perlu diulang';
}

/** Agregat analisis per soal lintas siswa (RUAS-009): % benar = tingkat kesukaran empiris. */
export function summarizeQuestionStatistics(answers: QuestionStatisticAnswer[]): QuestionStatistic[] {
  const byQuestion = new Map<number, QuestionStatisticAnswer[]>();
  for (const answer of answers) {
    const list = byQuestion.get(answer.question_id) ?? [];
    list.push(answer);
    byQuestion.set(answer.question_id, list);
  }
  return [...byQuestion.values()]
    .map((list) => {
      const correct = list.filter((answer) => answer.is_correct).length;
      const percent = list.length ? Math.round((correct / list.length) * 100) : 0;
      return {
        question_id: list[0].question_id,
        question_text: list[0].question_text,
        topic_label: list[0].topic_label,
        answered_count: list.length,
        correct_count: correct,
        correct_percent: percent,
        average_time_seconds: Math.round(list.reduce((total, answer) => total + answer.elapsed_seconds, 0) / list.length),
        difficulty_label: (percent >= 75 ? 'Terkuasai' : percent >= 50 ? 'Cukup' : 'Perlu diulang') as QuestionStatistic['difficulty_label'],
      };
    })
    .sort((a, b) => a.correct_percent - b.correct_percent || b.answered_count - a.answered_count);
}

export async function listQuestionStatistics(db: ReportDb, rows: ReportRow[]): Promise<QuestionStatistic[]> {
  const attemptIds = rows.filter((row) => row.status === 'completed').map((row) => row.attempt_id);
  if (attemptIds.length === 0) return [];
  const answers = await db
    .select({
      id: examAnswers.id,
      attempt_id: examAnswers.attempt_id,
      question_id: examAnswers.question_id,
      question_text: questions.question_text,
      topic_label: topics.label,
      is_correct: examAnswers.is_correct,
      elapsed_seconds: examAnswers.elapsed_seconds,
    })
    .from(examAnswers)
    .innerJoin(questions, eq(examAnswers.question_id, questions.id))
    .leftJoin(topics, eq(questions.topic_id, topics.id))
    .where(inArray(examAnswers.attempt_id, attemptIds))
    .orderBy(asc(examAnswers.id));
  const latestByAttemptQuestion = new Map<string, (typeof answers)[number]>();
  for (const answer of answers) latestByAttemptQuestion.set(`${answer.attempt_id}:${answer.question_id}`, answer);
  return summarizeQuestionStatistics([...latestByAttemptQuestion.values()].map((answer) => ({
    question_id: answer.question_id,
    question_text: answer.question_text,
    topic_label: answer.topic_label ?? 'Topik',
    is_correct: Boolean(answer.is_correct),
    elapsed_seconds: answer.elapsed_seconds,
  })));
}

function average(values: number[]) {
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;
}

function attemptTimestamp(row: ReportRow) {
  const value = row.completed_at ?? row.started_at;
  return value ? new Date(value).getTime() || row.attempt_id : row.attempt_id;
}

function attemptGroupKey(row: ReportRow) {
  return `${row.participant_id}:${row.subject_id}:${row.topic_id ?? 'none'}`;
}

function policyRows(rows: ReportRow[], policy: ReportScorePolicy = 'best') {
  const groups = new Map<string, ReportRow[]>();
  for (const row of rows.filter((item) => item.status === 'completed')) {
    const group = groups.get(attemptGroupKey(row)) ?? [];
    group.push(row);
    groups.set(attemptGroupKey(row), group);
  }

  return [...groups.values()].map((group) => {
    const ordered = [...group].sort((first, second) => attemptTimestamp(second) - attemptTimestamp(first) || second.attempt_id - first.attempt_id);
    if (policy === 'latest') return ordered[0];
    if (policy === 'best') return [...ordered].sort((first, second) => second.final_score - first.final_score || attemptTimestamp(second) - attemptTimestamp(first))[0];

    const latest = ordered[0];
    return {
      ...latest,
      final_score: average(group.map((row) => row.final_score)),
      accuracy: average(group.map((row) => row.accuracy)),
      total_time_seconds: Math.round(average(group.map((row) => row.total_time_seconds))),
      violation_count: Math.round(average(group.map((row) => row.violation_count))),
      integrity_penalty: Math.round(average(group.map((row) => row.integrity_penalty))),
    };
  });
}

export function summarizeReport(rows: Awaited<ReturnType<typeof listReportAttempts>>, policy: ReportScorePolicy = 'best') {
  const completed = rows.filter((row) => row.status === 'completed');
  const officialRows = policyRows(rows, policy);
  return {
    total_attempts: rows.length,
    completed_attempts: completed.length,
    in_progress_attempts: rows.filter((row) => row.status === 'in_progress').length,
    abandoned_attempts: rows.filter((row) => row.status === 'abandoned').length,
    average_score: average(officialRows.map((row) => row.final_score)),
    average_accuracy: average(officialRows.map((row) => row.accuracy)),
    average_time_seconds: Math.round(average(officialRows.map((row) => row.total_time_seconds))),
    total_violations: officialRows.reduce((total, row) => total + row.violation_count, 0),
  };
}

export type PendingParticipantState = 'not_started' | 'in_progress';

export interface PendingParticipant {
  participant_id: number;
  participant_name: string;
  username: string;
  class_id: number | null;
  class_label: string | null;
  state: PendingParticipantState;
}

export interface PendingParticipantUser {
  id: number;
  username: string;
  display_name: string;
  class_id: number | null;
  role: string;
  active: number;
  is_demo: number;
  created_by: string | null;
}

export interface PendingParticipantsData {
  topic: { subject_id: number; created_by: string | null } | null;
  subject_created_by: string | null;
  subject_class_created_by: string | null;
  schedule_access_mode: 'class' | 'individual' | null;
  schedule_participant_user_ids: number[];
  topic_class_ids: number[];
  classes: Array<{ id: number; label: string; created_by: string | null }>;
  users: PendingParticipantUser[];
  attempts: Array<{ username: string; status: ReportStatus }>;
}

/**
 * Daftar "Belum selesai" untuk satu topik: peserta yang diharapkan
 * mengerjakan tetapi belum punya attempt completed pada topik itu.
 *
 * Himpunan harapan ditentukan mode akses jadwal topik (pola yang sama
 * dengan assessment-schedule-service): mode 'individual' mengambil
 * daftar eksplisit assessment_schedule_participants; mode 'class' atau
 * topik tanpa jadwal mengambil roster peserta aktif yang kelasnya
 * terikat ke topik lewat topic_classes. Definisi "belum" hanya membaca
 * status attempt pada topik (completed menyingkirkan, in_progress
 * menandai) dan sengaja TIDAK dipengaruhi saringan tampilan lain
 * (status laporan, rentang tanggal, pencarian) agar daftar tindak
 * lanjut tidak berubah-ubah mengikuti saringan hasil.
 */
export function computePendingParticipants(data: PendingParticipantsData, filters: ReportFilters): PendingParticipant[] {
  if (!filters.topic_id || !data.topic) return [];
  const topic = data.topic;
  const classById = new Map(data.classes.map((item) => [item.id, item]));

  let expected: PendingParticipantUser[];
  if (data.schedule_access_mode === 'individual') {
    const ids = new Set(data.schedule_participant_user_ids);
    expected = data.users.filter((user) => ids.has(user.id));
  } else {
    if (data.topic_class_ids.length === 0) return [];
    const classIds = new Set(data.topic_class_ids);
    expected = data.users.filter((user) => user.class_id !== null && classIds.has(user.class_id));
  }
  expected = expected.filter((user) => user.role === 'participant' && user.active === 1 && user.is_demo === 0);

  const completedUsernames = new Set<string>();
  const inProgressUsernames = new Set<string>();
  for (const attempt of data.attempts) {
    if (attempt.status === 'completed') completedUsernames.add(attempt.username);
    if (attempt.status === 'in_progress') inProgressUsernames.add(attempt.username);
  }

  return expected
    .filter((user) => !completedUsernames.has(user.username))
    .filter((user) => !filters.class_id || user.class_id === filters.class_id)
    .filter((user) => {
      // Scope editor memakai pola kepemilikan/penugasan yang sama dengan
      // saringan baris pada listReportAttempts.
      if (!filters.scope_owner_username) {
        return (!filters.scope_subject_id || topic.subject_id === filters.scope_subject_id)
          && reportRowInClassScope(filters, user.class_id);
      }
      const classCreatedBy = (user.class_id !== null ? classById.get(user.class_id)?.created_by ?? null : null) ?? data.subject_class_created_by;
      const owned = data.subject_created_by === filters.scope_owner_username
        || classCreatedBy === filters.scope_owner_username
        || topic.created_by === filters.scope_owner_username
        || user.created_by === filters.scope_owner_username;
      const assigned = (!filters.scope_subject_id || topic.subject_id === filters.scope_subject_id)
        && reportRowInClassScope(filters, user.class_id);
      return owned || assigned;
    })
    .map((user) => ({
      participant_id: user.id,
      participant_name: user.display_name,
      username: user.username,
      class_id: user.class_id,
      class_label: user.class_id !== null ? classById.get(user.class_id)?.label ?? null : null,
      state: (inProgressUsernames.has(user.username) ? 'in_progress' : 'not_started') as PendingParticipantState,
    }))
    .sort((first, second) => (first.class_label ?? 'Tanpa kelas').localeCompare(second.class_label ?? 'Tanpa kelas', 'id')
      || first.participant_name.localeCompare(second.participant_name, 'id', { sensitivity: 'base' }));
}

export async function listPendingParticipants(db: ReportDb, filters: ReportFilters): Promise<PendingParticipant[]> {
  if (!filters.topic_id) return [];
  const topicId = filters.topic_id;

  const topicRows = await db
    .select({ subject_id: topics.subject_id, created_by: topics.created_by })
    .from(topics)
    .where(eq(topics.id, topicId));
  const topic = topicRows[0];
  if (!topic) return [];

  const [subjectRows, scheduleRows, topicClassRows, classRows, userRows, attemptRows] = await Promise.all([
    db.select({ created_by: subjects.created_by, class_id: subjects.class_id }).from(subjects).where(eq(subjects.id, topic.subject_id)),
    db.select({ id: assessmentSchedule.id, access_mode: assessmentSchedule.access_mode }).from(assessmentSchedule).where(eq(assessmentSchedule.topic_id, topicId)),
    db.select({ class_id: topicClasses.class_id }).from(topicClasses).where(eq(topicClasses.topic_id, topicId)),
    db.select({ id: educationClasses.id, label: educationClasses.label, created_by: educationClasses.created_by }).from(educationClasses),
    db.select({
      id: users.id,
      username: users.username,
      display_name: users.display_name,
      class_id: users.class_id,
      role: users.role,
      active: users.active,
      is_demo: users.is_demo,
      created_by: users.created_by,
    }).from(users),
    db.select({ username: participantProfiles.identity_key, status: examAttempts.status, is_demo: participantProfiles.is_demo })
      .from(examAttempts)
      .innerJoin(participantProfiles, eq(examAttempts.participant_id, participantProfiles.id))
      .where(eq(examAttempts.topic_id, topicId)),
  ]);

  const schedule = scheduleRows[0];
  const scheduleParticipantUserIds = schedule && schedule.access_mode === 'individual'
    ? (await db.select({ user_id: assessmentScheduleParticipants.user_id }).from(assessmentScheduleParticipants).where(eq(assessmentScheduleParticipants.schedule_id, schedule.id)))
      .map((row) => row.user_id)
    : [];
  const classById = new Map(classRows.map((item) => [item.id, item]));
  const subject = subjectRows[0];

  return computePendingParticipants({
    topic,
    subject_created_by: subject?.created_by ?? null,
    subject_class_created_by: subject?.class_id ? classById.get(subject.class_id)?.created_by ?? null : null,
    schedule_access_mode: schedule?.access_mode ?? null,
    schedule_participant_user_ids: scheduleParticipantUserIds,
    topic_class_ids: topicClassRows.map((row) => row.class_id),
    classes: classRows,
    users: userRows,
    attempts: attemptRows.filter((row) => row.is_demo === 0).map((row) => ({ username: row.username, status: row.status })),
  }, filters);
}

export function summarizeReportByClass(rows: Awaited<ReturnType<typeof listReportAttempts>>, policy: ReportScorePolicy = 'best') {
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

  return [...groups.values()]
    .sort((first, second) => first.class_label.localeCompare(second.class_label, 'id'))
    .map(({ class_id, class_label, rows: classRows }) => {
      const completed = classRows.filter((row) => row.status === 'completed');
      const officialRows = policyRows(classRows, policy);
      const participants = new Set(classRows.map((row) => row.participant_id));
      return {
        class_id,
        class_label,
        participant_count: participants.size,
        total_attempts: classRows.length,
        completed_attempts: completed.length,
        average_score: average(officialRows.map((row) => row.final_score)),
        average_accuracy: average(officialRows.map((row) => row.accuracy)),
        average_time_seconds: Math.round(average(officialRows.map((row) => row.total_time_seconds))),
        total_violations: officialRows.reduce((total, row) => total + row.violation_count, 0),
      };
    });
}
