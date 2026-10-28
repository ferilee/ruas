import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createReportDbMock, countReportAttemptsMock, resetAllReportDataMock, listReportAttemptsMock, listQuestionStatisticsMock, summarizeReportMock, summarizeReportByClassMock } = vi.hoisted(() => ({
  createReportDbMock: vi.fn(),
  countReportAttemptsMock: vi.fn(),
  resetAllReportDataMock: vi.fn(),
  listReportAttemptsMock: vi.fn(),
  listQuestionStatisticsMock: vi.fn(),
  summarizeReportMock: vi.fn(),
  summarizeReportByClassMock: vi.fn(),
}));

vi.mock('@/services/exam-service', () => ({
  createExamDb: createReportDbMock,
  expireOverdueAttempts: vi.fn().mockResolvedValue(0),
}));

vi.mock('@/services/report-service', () => ({
  createReportDb: createReportDbMock,
  countReportAttempts: countReportAttemptsMock,
  resetAllReportData: resetAllReportDataMock,
  getReportDetail: vi.fn(),
  listReportAttempts: listReportAttemptsMock,
  listQuestionStatistics: listQuestionStatisticsMock,
  summarizeReport: summarizeReportMock,
  summarizeReportByClass: summarizeReportByClassMock,
}));

describe('adminReportRoutes reset', () => {
  beforeEach(() => {
    createReportDbMock.mockReset().mockReturnValue({});
    countReportAttemptsMock.mockReset();
    resetAllReportDataMock.mockReset();
    listReportAttemptsMock.mockReset().mockResolvedValue([]);
    listQuestionStatisticsMock.mockReset().mockResolvedValue([]);
    summarizeReportMock.mockReset().mockReturnValue({});
    summarizeReportByClassMock.mockReset().mockReturnValue([]);
  });

  it('rejects reset without the exact confirmation phrase', async () => {
    const { adminReportRoutes } = await import('@/routes/admin-reports');
    const app = adminReportRoutes({} as never);
    const response = await app.request('http://localhost/reset', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'RESET HASIL' }),
    });

    expect(response.status).toBe(400);
    expect(resetAllReportDataMock).not.toHaveBeenCalled();
  });

  it('resets all report data after exact confirmation', async () => {
    resetAllReportDataMock.mockResolvedValue(7);
    const { adminReportRoutes } = await import('@/routes/admin-reports');
    const app = adminReportRoutes({} as never);
    const response = await app.request('http://localhost/reset', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'RESET HASIL ASESMEN' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deleted: 7 });
    expect(resetAllReportDataMock).toHaveBeenCalledWith({});
  });

  it('returns the current number of attempts for the confirmation dialog', async () => {
    countReportAttemptsMock.mockResolvedValue(12);
    const { adminReportRoutes } = await import('@/routes/admin-reports');
    const app = adminReportRoutes({} as never);
    const response = await app.request('http://localhost/reset/summary');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ attempts: 12 });
  });

  it('passes the selected topic to the report query', async () => {
    const { adminReportRoutes } = await import('@/routes/admin-reports');
    const app = adminReportRoutes({} as never);
    const response = await app.request('http://localhost/?status=all&topic_id=7');

    expect(response.status).toBe(200);
    expect(listReportAttemptsMock).toHaveBeenCalledWith({}, expect.objectContaining({ status: 'all', topic_id: 7 }));
  });
});
