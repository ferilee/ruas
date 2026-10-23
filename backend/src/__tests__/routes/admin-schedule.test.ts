import { beforeEach, describe, expect, it, vi } from 'vitest';

const { drizzleMock } = vi.hoisted(() => ({ drizzleMock: vi.fn() }));

vi.mock('drizzle-orm/mysql2', () => ({ drizzle: drizzleMock }));

describe('adminScheduleRoutes', () => {
  beforeEach(() => drizzleMock.mockReset());

  it('returns schedules grouped by topic', async () => {
    drizzleMock.mockReturnValue({
      select: (shape?: unknown) => {
        if (shape && typeof shape === 'object' && 'schedule_id' in (shape as Record<string, unknown>)) {
          return {
            from: () => ({
              innerJoin: () => ({
                where: async () => [],
              }),
            }),
          };
        }
        if (shape && typeof shape === 'object' && 'topic_label' in (shape as Record<string, unknown>)) {
          return {
            from: () => ({
              innerJoin: () => ({
                innerJoin: () => ({
                  leftJoin: async () => [{
                id: 2,
                topic_id: 3,
                topic_label: 'Barisan dan Deret',
                subject_id: 4,
                subject_label: 'Matematika',
                assessment_type_id: 1,
                assessment_type_label: 'Asesmen Tengah Semester',
                start_at: new Date(Date.now() - 60 * 60 * 1000),
                end_at: new Date(Date.now() + 60 * 60 * 1000),
                enabled: true,
                notes: 'Sesi pagi',
                updated_at: new Date('2026-10-11T01:00:00.000Z'),
                  }],
                }),
              }),
            }),
          };
        }
        throw new Error('Unexpected query');
      },
    });

    const { adminScheduleRoutes } = await import('@/routes/admin-schedule');
    const app = adminScheduleRoutes({} as never);
    const response = await app.request('http://localhost/');

    expect(response.status).toBe(200);
    const body = await response.json() as { schedules: Array<{ topic_id: number; topic_label: string; state: string }> };
    expect(body.schedules).toHaveLength(1);
    expect(body.schedules[0]).toMatchObject({ topic_id: 3, topic_label: 'Barisan dan Deret', state: 'open' });
  });

  it('rejects an invalid schedule window', async () => {
    drizzleMock.mockReturnValue({ select: vi.fn() });
    const { adminScheduleRoutes } = await import('@/routes/admin-schedule');
    const app = adminScheduleRoutes({} as never);
    const response = await app.request('http://localhost/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_at: '2026-10-12T04:00:00.000Z', end_at: '2026-10-12T01:00:00.000Z', enabled: true, notes: null }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'invalid_body' });
  });
});
