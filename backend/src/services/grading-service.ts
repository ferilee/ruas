import { and, asc, eq } from 'drizzle-orm';
import { examAnswers } from '@/db/schema/exam-answers';
import { examAttempts } from '@/db/schema/exam-attempts';
import { questions } from '@/db/schema/questions';
import { countPendingEssaysByAttempt, createReportDb, listReportAttempts } from '@/services/report-service';
import { recomputeAttemptAggregates, type AttemptAggregates } from '@/services/exam-service';

type ReportDb = ReturnType<typeof createReportDb>;
type ExamDb = Parameters<typeof recomputeAttemptAggregates>[0];

function toIso(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export interface GradingQueueFilters {
  scope_subject_id?: number;
  scope_class_ids?: number[];
  scope_owner_username?: string;
}

/**
 * Antrean penilaian: attempt selesai yang masih memiliki jawaban Uraian
 * Singkat belum dinilai. Baris berasal dari listReportAttempts agar saringan
 * kepemilikan/penugasan guru persis sama dengan laporan.
 */
export async function listGradingQueue(db: ReportDb, filters: GradingQueueFilters = {}) {
  const rows = await listReportAttempts(db, { status: 'completed', ...filters });
  return rows.filter((row) => row.grading_pending_count > 0);
}

export async function getGradingDetail(db: ReportDb, attemptId: number) {
  const rows = await listReportAttempts(db, { status: 'all' });
  const attempt = rows.find((row) => row.attempt_id === attemptId);
  if (!attempt || attempt.status !== 'completed') return null;

  const answers = await db
    .select({
      answer_id: examAnswers.id,
      question_id: examAnswers.question_id,
      question_text: questions.question_text,
      grading_guide: questions.grading_guide,
      answer_text: examAnswers.answer_text,
      score_fraction: examAnswers.score_fraction,
      graded_by: examAnswers.graded_by,
      graded_at: examAnswers.graded_at,
      elapsed_seconds: examAnswers.elapsed_seconds,
      answered_at: examAnswers.answered_at,
    })
    .from(examAnswers)
    .innerJoin(questions, eq(examAnswers.question_id, questions.id))
    .where(and(eq(examAnswers.attempt_id, attemptId), eq(questions.type, 'short_essay')))
    .orderBy(asc(examAnswers.id));

  return {
    attempt,
    answers: answers.map((answer) => ({
      ...answer,
      answered_at: toIso(answer.answered_at),
      graded_at: toIso(answer.graded_at),
      pending: answer.score_fraction === null || answer.score_fraction === undefined,
    })),
    grading_pending_count: answers.filter((answer) => answer.score_fraction === null || answer.score_fraction === undefined).length,
  };
}

export type GradeEssayResult =
  | { graded: true; answer_id: number; score_fraction: number; is_correct: boolean; graded_by: string; graded_at: string; aggregates: AttemptAggregates; grading_pending_count: number }
  | { graded: false; reason: 'not_found' | 'attempt_not_completed' };

/**
 * Menyimpan nilai manual satu jawaban uraian lalu menghitung ulang agregat
 * attempt lewat jalur yang sama dengan penyelesaian attempt. is_correct
 * mengikuti konvensi skor parsial: hanya pecahan penuh (1) yang benar.
 */
export async function gradeEssayAnswer(
  db: ReportDb,
  examDb: ExamDb,
  attemptId: number,
  answerId: number,
  fraction: number,
  gradedBy: string,
): Promise<GradeEssayResult> {
  const [attempt] = await db
    .select({ status: examAttempts.status })
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
    .limit(1);
  if (!attempt) return { graded: false, reason: 'not_found' };
  if (attempt.status !== 'completed') return { graded: false, reason: 'attempt_not_completed' };

  const [answer] = await db
    .select({ id: examAnswers.id })
    .from(examAnswers)
    .innerJoin(questions, eq(examAnswers.question_id, questions.id))
    .where(and(eq(examAnswers.id, answerId), eq(examAnswers.attempt_id, attemptId), eq(questions.type, 'short_essay')))
    .limit(1);
  if (!answer) return { graded: false, reason: 'not_found' };

  const gradedAt = new Date();
  const isCorrect = fraction >= 1;
  await db.update(examAnswers).set({
    score_fraction: fraction,
    is_correct: isCorrect,
    graded_by: gradedBy,
    graded_at: gradedAt,
  }).where(eq(examAnswers.id, answerId));

  const aggregates = await recomputeAttemptAggregates(examDb, attemptId);
  const pendingByAttempt = await countPendingEssaysByAttempt(db, [attemptId]);

  return {
    graded: true,
    answer_id: answerId,
    score_fraction: fraction,
    is_correct: isCorrect,
    graded_by: gradedBy,
    graded_at: gradedAt.toISOString(),
    aggregates,
    grading_pending_count: pendingByAttempt.get(attemptId) ?? 0,
  };
}
