import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createExamDbMock,
  completeAttemptMock,
  findAttemptMock,
  getNextAttemptQuestionMock,
  getAttemptQuestionMock,
  isAttemptExpiredMock,
  updateAttemptQuestionFlagMock,
} = vi.hoisted(() => ({
  createExamDbMock: vi.fn(),
  completeAttemptMock: vi.fn(),
  findAttemptMock: vi.fn(),
  getNextAttemptQuestionMock: vi.fn(),
  getAttemptQuestionMock: vi.fn(),
  isAttemptExpiredMock: vi.fn(),
  updateAttemptQuestionFlagMock: vi.fn(),
}));

vi.mock('@/services/exam-service', () => ({
  abandonAttempt: vi.fn(),
  completeAttempt: completeAttemptMock,
  createAttempt: vi.fn(),
  createExamDb: createExamDbMock,
  findActiveAttempt: vi.fn(),
  findAttempt: findAttemptMock,
  findAttemptAnswers: vi.fn(),
  getAttemptAvailability: vi.fn(),
  getExamReview: vi.fn(),
  getNextAttemptQuestion: getNextAttemptQuestionMock,
  getAttemptQuestion: getAttemptQuestionMock,
  getQuestionExplanationMode: vi.fn(),
  getSubjectExamSettings: vi.fn(),
  isAttemptExpired: isAttemptExpiredMock,
  saveAnswer: vi.fn(),
  saveIntegrityEvent: vi.fn(),
  updateAttemptQuestionFlag: updateAttemptQuestionFlagMock,
}));

describe('examAttemptRoutes next question', () => {
  beforeEach(() => {
    createExamDbMock.mockReset().mockReturnValue({});
    findAttemptMock.mockReset();
    getNextAttemptQuestionMock.mockReset();
    getAttemptQuestionMock.mockReset();
    completeAttemptMock.mockReset();
    updateAttemptQuestionFlagMock.mockReset();
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

  it('blocks manual submission before the minimum duration', async () => {
    completeAttemptMock.mockResolvedValue({ blocked: true, minimum_duration_seconds: 2700, elapsed_seconds: 600 });
    const { examAttemptRoutes } = await import('@/routes/exam-attempts');
    const app = examAttemptRoutes({} as never);
    const response = await app.request('http://localhost/7/complete', {
      method: 'POST',
      headers: { 'x-client-id': 'siswa-01' },
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: 'minimum_duration_not_reached', minimum_duration_seconds: 2700 });
  });

  it('returns a requested question number for navigation', async () => {
    findAttemptMock.mockResolvedValue({ id: 7, status: 'in_progress' });
    getAttemptQuestionMock.mockResolvedValue({
      question: { id: 12, type: 'single_choice', difficulty: 'easy', question_text: 'Soal contoh', options: [] },
      question_number: 2,
      total_questions: 10,
      selected_keys: ['A'],
      answered: true,
      is_doubtful: true,
    });

    const { examAttemptRoutes } = await import('@/routes/exam-attempts');
    const app = examAttemptRoutes({} as never);
    const response = await app.request('http://localhost/7/questions/2', { headers: { 'x-client-id': 'siswa-01' } });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ question_number: 2, is_doubtful: true });
    expect(getAttemptQuestionMock).toHaveBeenCalledWith({}, 7, 'siswa-01', 2);
  });

  it('saves the doubtful status for a question', async () => {
    updateAttemptQuestionFlagMock.mockResolvedValue({ question_id: 12, is_doubtful: true, doubtful_question_ids: [12] });

    const { examAttemptRoutes } = await import('@/routes/exam-attempts');
    const app = examAttemptRoutes({} as never);
    const response = await app.request('http://localhost/7/questions/12/flag', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-client-id': 'siswa-01' },
      body: JSON.stringify({ is_doubtful: true }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ question_id: 12, is_doubtful: true, doubtful_question_ids: [12] });
    expect(updateAttemptQuestionFlagMock).toHaveBeenCalledWith({}, 7, 'siswa-01', 12, true);
  });
});
