import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listGradingQueueMock, getGradingDetailMock, gradeEssayAnswerMock } = vi.hoisted(() => ({
  listGradingQueueMock: vi.fn(),
  getGradingDetailMock: vi.fn(),
  gradeEssayAnswerMock: vi.fn(),
}));

vi.mock('@/services/exam-service', () => ({
  createExamDb: vi.fn().mockReturnValue({}),
}));

vi.mock('@/services/report-service', () => ({
  createReportDb: vi.fn().mockReturnValue({}),
}));

vi.mock('@/services/grading-service', () => ({
  listGradingQueue: listGradingQueueMock,
  getGradingDetail: getGradingDetailMock,
  gradeEssayAnswer: gradeEssayAnswerMock,
}));

const detailFixture = {
  attempt: { attempt_id: 7, subject_id: 2, class_id: null, status: 'completed' },
  answers: [],
  grading_pending_count: 1,
};

async function buildApp() {
  const { adminGradingRoutes } = await import('@/routes/admin-grading');
  return adminGradingRoutes({} as never);
}

describe('adminGradingRoutes', () => {
  beforeEach(() => {
    listGradingQueueMock.mockReset().mockResolvedValue([{ attempt_id: 7, grading_pending_count: 2 }]);
    getGradingDetailMock.mockReset().mockResolvedValue(detailFixture);
    gradeEssayAnswerMock.mockReset();
  });

  it('returns the grading queue', async () => {
    const app = await buildApp();
    const response = await app.request('http://localhost/queue');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ rows: [{ attempt_id: 7, grading_pending_count: 2 }] });
  });

  it('converts a percent score into a fraction for the grading service', async () => {
    gradeEssayAnswerMock.mockResolvedValue({
      graded: true,
      answer_id: 55,
      score_fraction: 0.8,
      is_correct: false,
      graded_by: 'env-admin',
      graded_at: '2026-11-25T00:00:00.000Z',
      aggregates: { answered_questions: 30, correct_count: 20, incorrect_count: 10, accuracy: 74, final_score: 74 },
      grading_pending_count: 0,
    });
    const app = await buildApp();
    const response = await app.request('http://localhost/attempts/7/answers/55', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ score_percent: 80 }),
    });
    expect(response.status).toBe(200);
    expect(gradeEssayAnswerMock).toHaveBeenCalledWith(expect.anything(), expect.anything(), 7, 55, 0.8, expect.any(String));
    const body = await response.json();
    expect(body.result.score_fraction).toBe(0.8);
    expect(body.result.aggregates.final_score).toBe(74);
  });

  it('accepts a direct fraction score', async () => {
    gradeEssayAnswerMock.mockResolvedValue({ graded: true, answer_id: 55, score_fraction: 1, is_correct: true, graded_by: 'env-admin', graded_at: '2026-11-25T00:00:00.000Z', aggregates: { answered_questions: 30, correct_count: 21, incorrect_count: 9, accuracy: 77, final_score: 77 }, grading_pending_count: 0 });
    const app = await buildApp();
    const response = await app.request('http://localhost/attempts/7/answers/55', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ score_fraction: 1 }),
    });
    expect(response.status).toBe(200);
    expect(gradeEssayAnswerMock).toHaveBeenCalledWith(expect.anything(), expect.anything(), 7, 55, 1, expect.any(String));
  });

  it('rejects a grade without any score', async () => {
    const app = await buildApp();
    const response = await app.request('http://localhost/attempts/7/answers/55', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
    expect(gradeEssayAnswerMock).not.toHaveBeenCalled();
  });

  it('rejects out-of-range scores', async () => {
    const app = await buildApp();
    const response = await app.request('http://localhost/attempts/7/answers/55', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ score_percent: 140 }),
    });
    expect(response.status).toBe(400);
    expect(gradeEssayAnswerMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the attempt is not available for grading', async () => {
    getGradingDetailMock.mockResolvedValue(null);
    const app = await buildApp();
    const response = await app.request('http://localhost/attempts/99/answers/55', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ score_percent: 50 }),
    });
    expect(response.status).toBe(404);
    expect(gradeEssayAnswerMock).not.toHaveBeenCalled();
  });

  it('returns 409 when the attempt is not completed yet', async () => {
    gradeEssayAnswerMock.mockResolvedValue({ graded: false, reason: 'attempt_not_completed' });
    const app = await buildApp();
    const response = await app.request('http://localhost/attempts/7/answers/55', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ score_percent: 50 }),
    });
    expect(response.status).toBe(409);
  });
});
