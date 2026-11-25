import { beforeEach, describe, expect, it, vi } from 'vitest';
import { questions } from '@/db/schema/questions';
import { questionOptions } from '@/db/schema/question-options';
import { topicQuestions } from '@/db/schema/topic-questions';

const { saveAnswerMock } = vi.hoisted(() => ({
  saveAnswerMock: vi.fn(),
}));

const essayQuestion = {
  id: 43,
  topic_id: 3,
  type: 'short_essay',
  difficulty: 'medium',
  question_text: 'Jelaskan mengapa dekomposisi membantu menyelesaikan masalah kompleks.',
  explanation_text: 'Pembahasan uraian.',
  grading_guide: 'Pedoman rahasia guru.',
};

function createFakeDb() {
  return {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: () => {
            if (table === questions) return Promise.resolve([essayQuestion]);
            if (table === topicQuestions) return Promise.resolve([{ question_id: 43 }]);
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
  countPendingEssayAnswers: vi.fn().mockResolvedValue(1),
  createAttempt: vi.fn(),
  createExamDb: () => ({
    select: () => ({
      from: (table: unknown) => {
        if (table === questionOptions) {
          return { where: () => Promise.resolve([]) };
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

async function postEssayAnswer(body: Record<string, unknown>) {
  const { examAttemptRoutes } = await import('@/routes/exam-attempts');
  const app = examAttemptRoutes({} as never);
  return app.request('http://localhost/7/answers', {
    method: 'POST',
    headers: { 'x-client-id': 'siswa-01', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('examAttemptRoutes answers - short_essay', () => {
  beforeEach(() => {
    saveAnswerMock.mockReset().mockResolvedValue(undefined);
  });

  it('stores free text as a pending answer without an automatic key', async () => {
    const response = await postEssayAnswer({ question_id: 43, selected_keys: [], answer_text: 'Dekomposisi memecah masalah menjadi bagian kecil.', elapsed_seconds: 45 });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pending_grading).toBe(true);
    expect(body.correct_keys).toEqual([]);
    expect(JSON.stringify(body)).not.toContain('Pedoman rahasia guru');
    expect(saveAnswerMock).toHaveBeenCalledWith(expect.anything(), 7, expect.objectContaining({
      question_id: 43,
      selected_keys: [],
      is_correct: false,
      score_fraction: null,
      answer_text: 'Dekomposisi memecah masalah menjadi bagian kecil.',
      elapsed_seconds: 45,
    }));
  });

  it('rejects an empty essay answer as not yet answered', async () => {
    const blank = await postEssayAnswer({ question_id: 43, selected_keys: [], answer_text: '   ', elapsed_seconds: 10 });
    expect(blank.status).toBe(400);
    const missing = await postEssayAnswer({ question_id: 43, selected_keys: [], elapsed_seconds: 10 });
    expect(missing.status).toBe(400);
    expect(saveAnswerMock).not.toHaveBeenCalled();
  });
});
