import { describe, expect, it } from 'vitest';
import { examAnswers } from '@/db/schema/exam-answers';
import { examAttempts } from '@/db/schema/exam-attempts';
import { questions } from '@/db/schema/questions';
import { getAttemptQuestion, getNextAttemptQuestion, recomputeAttemptAggregates } from '@/services/exam-service';
import { gradeEssayAnswer } from '@/services/grading-service';

type Row = Record<string, unknown>;

function pickFields(row: Row, fields?: Record<string, unknown>): Row {
  if (!fields) return { ...row };
  const picked: Row = {};
  for (const key of Object.keys(fields)) picked[key] = row[key];
  return picked;
}

function chainable(rows: Row[]) {
  const node: Record<string, unknown> = {};
  for (const method of ['innerJoin', 'leftJoin', 'where', 'orderBy', 'limit', 'groupBy']) {
    node[method] = () => node;
  }
  node.then = (resolve: (value: Row[]) => void, reject?: (reason?: unknown) => void) => Promise.resolve(rows).then(resolve, reject);
  return node;
}

function createFakeDb(rowsByTable: Map<unknown, Row[]>, updates: Array<{ table: unknown; values: Row }> = []) {
  return {
    select: (fields?: Record<string, unknown>) => ({
      from: (table: unknown) => chainable((rowsByTable.get(table) ?? []).map((row) => pickFields(row, fields))),
    }),
    update: (table: unknown) => ({
      set: (values: Row) => {
        updates.push({ table, values });
        return { where: () => Promise.resolve([]) };
      },
    }),
  };
}

describe('recomputeAttemptAggregates', () => {
  it('counts a pending essay as zero and a graded essay by its fraction', async () => {
    const updates: Array<{ table: unknown; values: Row }> = [];
    const db = createFakeDb(new Map([[examAnswers, [
      { question_id: 1, is_correct: true, score_fraction: null },
      { question_id: 2, is_correct: false, score_fraction: 0.5 },
      { question_id: 3, is_correct: false, score_fraction: null },
    ]]]), updates);

    const aggregates = await recomputeAttemptAggregates(db as never, 7);
    expect(aggregates).toEqual({ answered_questions: 3, correct_count: 1, incorrect_count: 2, accuracy: 50, final_score: 50 });
    expect(updates).toEqual([{ table: examAttempts, values: aggregates }]);
  });
});

describe('gradeEssayAnswer', () => {
  function buildDbs(attemptStatus: string) {
    const reportUpdates: Array<{ table: unknown; values: Row }> = [];
    const reportDb = createFakeDb(new Map<unknown, Row[]>([
      [examAttempts, [{ id: 7, status: attemptStatus }]],
      [examAnswers, [{ id: 55, attempt_id: 7, question_id: 43 }]],
    ]), reportUpdates);
    const examUpdates: Array<{ table: unknown; values: Row }> = [];
    const examDb = createFakeDb(new Map<unknown, Row[]>([
      [examAnswers, [
        { question_id: 1, is_correct: true, score_fraction: null },
        { question_id: 43, is_correct: false, score_fraction: 0.8 },
        { question_id: 9, is_correct: false, score_fraction: null },
      ]],
    ]), examUpdates);
    return { reportDb, examDb, reportUpdates, examUpdates };
  }

  it('stores the fraction, follows the partial-score is_correct convention, and recomputes aggregates', async () => {
    const { reportDb, examDb, reportUpdates, examUpdates } = buildDbs('completed');
    const result = await gradeEssayAnswer(reportDb as never, examDb as never, 7, 55, 0.8, 'guru-satu');
    expect(result.graded).toBe(true);
    if (!result.graded) return;
    expect(result.score_fraction).toBe(0.8);
    expect(result.is_correct).toBe(false);
    expect(result.aggregates).toEqual({ answered_questions: 3, correct_count: 1, incorrect_count: 2, accuracy: 60, final_score: 60 });
    expect(reportUpdates).toHaveLength(1);
    expect(reportUpdates[0].table).toBe(examAnswers);
    expect(reportUpdates[0].values).toMatchObject({ score_fraction: 0.8, is_correct: false, graded_by: 'guru-satu' });
    expect(examUpdates).toEqual([{ table: examAttempts, values: result.aggregates }]);
  });

  it('marks a full fraction as correct', async () => {
    const { reportDb, examDb, reportUpdates } = buildDbs('completed');
    const result = await gradeEssayAnswer(reportDb as never, examDb as never, 7, 55, 1, 'guru-satu');
    expect(result.graded).toBe(true);
    expect(reportUpdates[0].values).toMatchObject({ score_fraction: 1, is_correct: true });
  });

  it('refuses to grade an attempt that is not completed', async () => {
    const { reportDb, examDb, reportUpdates } = buildDbs('in_progress');
    const result = await gradeEssayAnswer(reportDb as never, examDb as never, 7, 55, 0.5, 'guru-satu');
    expect(result).toEqual({ graded: false, reason: 'attempt_not_completed' });
    expect(reportUpdates).toHaveLength(0);
  });
});

describe('essay question payloads for students', () => {
  const attemptRow = {
    id: 7,
    topic_id: 3,
    subject_id: 2,
    status: 'in_progress',
    total_questions: 1,
    question_order: [43],
    option_order: { '43': [] },
    deadline_at: null,
    doubtful_question_ids: [],
  };
  const questionRow = {
    id: 43,
    type: 'short_essay',
    difficulty: 'medium',
    question_text: 'Jelaskan langkah dekomposisi.',
    explanation_text: 'Pembahasan.',
    grading_guide: 'PEDOMAN RAHASIA GURU',
  };

  function buildDb(answerRows: Row[]) {
    return createFakeDb(new Map<unknown, Row[]>([
      [examAttempts, [{ attempt: attemptRow }]],
      [questions, [questionRow]],
      [examAnswers, answerRows],
    ]));
  }

  it('getAttemptQuestion restores the essay text without leaking the grading guide', async () => {
    const db = buildDb([{ selected_keys: [], answer_text: 'Jawaban murid.', elapsed_seconds: 21 }]);
    const result = await getAttemptQuestion(db as never, 7, 'siswa-01', 1, null);
    expect(result).not.toBeNull();
    expect(result?.answer_text).toBe('Jawaban murid.');
    expect(result?.question).not.toHaveProperty('grading_guide');
    expect(JSON.stringify(result)).not.toContain('PEDOMAN RAHASIA GURU');
  });

  it('getNextAttemptQuestion never includes the grading guide', async () => {
    const db = buildDb([]);
    const result = await getNextAttemptQuestion(db as never, 7, 'siswa-01', null);
    expect(result?.question?.id).toBe(43);
    expect(result?.question).not.toHaveProperty('grading_guide');
    expect(JSON.stringify(result)).not.toContain('PEDOMAN RAHASIA GURU');
  });
});
