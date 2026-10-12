import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createReportDbMock, countReportAttemptsMock, resetAllReportDataMock } = vi.hoisted(() => ({
  createReportDbMock: vi.fn(),
  countReportAttemptsMock: vi.fn(),
  resetAllReportDataMock: vi.fn(),
}));

vi.mock('@/services/report-service', () => ({
  createReportDb: createReportDbMock,
  countReportAttempts: countReportAttemptsMock,
  resetAllReportData: resetAllReportDataMock,
  getReportDetail: vi.fn(),
  listReportAttempts: vi.fn(),
  summarizeReport: vi.fn(),
  summarizeReportByClass: vi.fn(),
}));

describe('adminReportRoutes reset', () => {
  beforeEach(() => {
    createReportDbMock.mockReset().mockReturnValue({});
    countReportAttemptsMock.mockReset();
    resetAllReportDataMock.mockReset();
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
});
