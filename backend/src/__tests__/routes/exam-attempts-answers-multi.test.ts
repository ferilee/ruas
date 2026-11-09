import { beforeEach, describe, expect, it, vi } from 'vitest';
import { questions } from '@/db/schema/questions';
import { questionOptions } from '@/db/schema/question-options';
import { topicQuestions } from '@/db/schema/topic-questions';

const { saveAnswerMock, questionHolder } = vi.hoisted(() => ({
  saveAnswerMock: vi.fn(),
  questionHolder: {
    current: {
      id: 42,
      topic_id: 3,
      type: 'true_false_multi',
      difficulty: 'medium',
      question_text: 'Stimulus bersama.',
      explanation_text: 'Pembahasan.',
    } as Record<string, unknown>,
  },
}));

const statementRows = [
  { question_id: 42, option_key: 'S1', option_text: 'Pernyataan 1', is_correct: true, display_order: 1 },
  { question_id: 42, option_key: 'S2', option_text: 'Pernyataan 2', is_correct: false, display_order: 2 },
  { question_id: 42, option_key: 'S3', option_text: 'Pernyataan 3', is_correct: true, display_order: 3 },
  { question_id: 42, option_key: 'S4', option_text: 'Pernyataan 4', is_correct: false, display_order: 4 },
];

function createFakeDb() {
  return {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: () => {
            if (table === questions) return Promise.resolve([questionHolder.current]);
            if (table === topicQuestions) return Promise.resolve([{ question_id: 42 }]);
            return Promise.resolve([]);
          },
        }),
      }),
    }),
  };
}

vi.mock('@/services/exam-service', () => ({
  abandonAttempt: vi.fn(),
  completeAttempt: vi.fn(),
  createAttempt: vi.fn(),
  createExamDb: () => ({
    select: () => ({
      from: (table: unknown) => {
        if (table === questionOptions) {
          return { where: () => Promise.resolve(statementRows) };
        }
        return createFakeDb().select().from(table);
      },
    }),
  }),
  findActiveAttempt: vi.fn(),
  findAttempt: vi.fn().mockResolvedValue({ id: 7, status: 'in_progress', topic_id: 3, subject_id: 2 }),
  findAttemptAnswers: vi.fn(),
  getAttemptAvailability: vi.fn(),
  getExamReview: vi.fn(),
  getNextAttemptQuestion: vi.fn(),
  getAttemptQuestion: vi.fn(),
  getQuestionExplanationMode: vi.fn().mockResolvedValue('after_answer'),
  getSubjectExamSettings: vi.fn().mockResolvedValue({ show_correct_answer_on_wrong: true, duration_minutes: 60, minimum_duration_minutes: 45 }),
  isAttemptExpired: vi.fn().mockReturnValue(false),
  saveAnswer: saveAnswerMock,
  saveIntegrityEvent: vi.fn(),
  updateAttemptQuestionFlag: vi.fn(),
}));

async function postAnswer(selectedKeys: string[]) {
  const { examAttemptRoutes } = await import('@/routes/exam-attempts');
  const app = examAttemptRoutes({} as never);
  return app.request('http://localhost/7/answers', {
    method: 'POST',
    headers: { 'x-client-id': 'siswa-01', 'content-type': 'application/json' },
    body: JSON.stringify({ question_id: 42, selected_keys: selectedKeys, elapsed_seconds: 30 }),
  });
}

describe('examAttemptRoutes answers - true_false_multi', () => {
  beforeEach(() => {
    saveAnswerMock.mockReset().mockResolvedValue(undefined);
    questionHolder.current = {
      id: 42,
      topic_id: 3,
      type: 'true_false_multi',
      difficulty: 'medium',
      question_text: 'Stimulus bersama.',
      explanation_text: 'Pembahasan.',
    };
  });

  it('accepts an empty selection as judging every statement Salah and stores the fraction', async () => {
    const response = await postAnswer([]);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.correct).toBe(false);
    expect(body.score_fraction).toBe(0.5);
    expect(body.statement_results).toHaveLength(4);
    expect(saveAnswerMock).toHaveBeenCalledWith(expect.anything(), 7, expect.objectContaining({ is_correct: false, score_fraction: 0.5 }));
  });

  it('marks the answer correct with fraction 1 when all judgements are exact', async () => {
    const response = await postAnswer(['S1', 'S3']);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.correct).toBe(true);
    expect(body.score_fraction).toBe(1);
    expect(saveAnswerMock).toHaveBeenCalledWith(expect.anything(), 7, expect.objectContaining({ is_correct: true, score_fraction: 1 }));
  });

  it('rejects statement keys that do not belong to the question', async () => {
    const response = await postAnswer(['S9']);
    expect(response.status).toBe(400);
    expect(saveAnswerMock).not.toHaveBeenCalled();
  });

  it('still rejects an empty selection for legacy question types', async () => {
    questionHolder.current = { ...questionHolder.current, type: 'single_choice' };
    const response = await postAnswer([]);
    expect(response.status).toBe(400);
    expect(saveAnswerMock).not.toHaveBeenCalled();
  });
});
