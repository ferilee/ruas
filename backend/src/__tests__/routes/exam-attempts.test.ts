import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createExamDbMock,
  findAttemptMock,
  getNextAttemptQuestionMock,
  isAttemptExpiredMock,
} = vi.hoisted(() => ({
  createExamDbMock: vi.fn(),
  findAttemptMock: vi.fn(),
  getNextAttemptQuestionMock: vi.fn(),
  isAttemptExpiredMock: vi.fn(),
}));

vi.mock('@/services/exam-service', () => ({
  abandonAttempt: vi.fn(),
  completeAttempt: vi.fn(),
  createAttempt: vi.fn(),
  createExamDb: createExamDbMock,
  findActiveAttempt: vi.fn(),
  findAttempt: findAttemptMock,
  findAttemptAnswers: vi.fn(),
  getAttemptAvailability: vi.fn(),
  getExamReview: vi.fn(),
  getNextAttemptQuestion: getNextAttemptQuestionMock,
  getQuestionExplanationMode: vi.fn(),
  getSubjectExamSettings: vi.fn(),
  isAttemptExpired: isAttemptExpiredMock,
  saveAnswer: vi.fn(),
  saveIntegrityEvent: vi.fn(),
}));

describe('examAttemptRoutes next question', () => {
  beforeEach(() => {
    createExamDbMock.mockReset().mockReturnValue({});
    findAttemptMock.mockReset();
    getNextAttemptQuestionMock.mockReset();
  });

  it('returns the next question for the participant attempt', async () => {
    findAttemptMock.mockResolvedValue({ id: 7, status: 'in_progress' });
    getNextAttemptQuestionMock.mockResolvedValue({
      question: {
        id: 12,
        type: 'single_choice',
        difficulty: 'easy',
        question_text: 'Soal contoh',
        options: [{ key: 'A', text: 'Pilihan A' }],
      },
    });

    const { examAttemptRoutes } = await import('@/routes/exam-attempts');
    const app = examAttemptRoutes({} as never);
    const response = await app.request('http://localhost/7/next-question', {
      headers: { 'x-client-id': 'siswa-01' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      question: {
        id: 12,
        type: 'single_choice',
        difficulty: 'easy',
        question_text: 'Soal contoh',
        options: [{ key: 'A', text: 'Pilihan A' }],
      },
    });
    expect(getNextAttemptQuestionMock).toHaveBeenCalledWith({}, 7, 'siswa-01');
  });
});
