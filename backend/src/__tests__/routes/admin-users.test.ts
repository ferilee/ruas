import { beforeEach, describe, expect, it, vi } from 'vitest';

const { drizzleMock } = vi.hoisted(() => ({
  drizzleMock: vi.fn(),
}));

vi.mock('drizzle-orm/mysql2', () => ({
  drizzle: drizzleMock,
}));

describe('adminUserRoutes bulk subject assignment', () => {
  beforeEach(() => {
    drizzleMock.mockReset();
  });

  it('updates the subject for selected users', async () => {
    const limit = vi.fn().mockResolvedValue([{ id: 4 }]);
    const whereSelect = vi.fn(() => ({ limit }));
    const updateWhere = vi.fn().mockResolvedValue([{ affectedRows: 2 }]);
    const set = vi.fn(() => ({ where: updateWhere }));
    const db = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: whereSelect })) })),
      update: vi.fn(() => ({ set })),
    };
    drizzleMock.mockReturnValue(db);

    const { adminUserRoutes } = await import('@/routes/admin-users');
    const app = adminUserRoutes({} as never);
    const response = await app.request('http://localhost/bulk-subject', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: [11, 12], subject_id: 4 }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ updated: 2 });
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ subject_id: 4 }));
  });

  it('allows clearing the subject assignment', async () => {
    const updateWhere = vi.fn().mockResolvedValue([{ affectedRows: 1 }]);
    const db = {
      select: vi.fn(),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
    };
    drizzleMock.mockReturnValue(db);

    const { adminUserRoutes } = await import('@/routes/admin-users');
    const app = adminUserRoutes({} as never);
    const response = await app.request('http://localhost/bulk-subject', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: [11], subject_id: null }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ updated: 1 });
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it('updates the class for selected users', async () => {
    const limit = vi.fn().mockResolvedValue([{ id: 3 }]);
    const whereSelect = vi.fn(() => ({ limit }));
    const updateWhere = vi.fn().mockResolvedValue([{ affectedRows: 3 }]);
    const set = vi.fn(() => ({ where: updateWhere }));
    const db = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: whereSelect })) })),
      update: vi.fn(() => ({ set })),
    };
    drizzleMock.mockReturnValue(db);

    const { adminUserRoutes } = await import('@/routes/admin-users');
    const app = adminUserRoutes({} as never);
    const response = await app.request('http://localhost/bulk-class', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: [11, 12, 13], class_id: 3 }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ updated: 3 });
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ class_id: 3 }));
  });

  it('rejects an empty selection before touching the database', async () => {
    const db = { select: vi.fn(), update: vi.fn() };
    drizzleMock.mockReturnValue(db);

    const { adminUserRoutes } = await import('@/routes/admin-users');
    const app = adminUserRoutes({} as never);
    const response = await app.request('http://localhost/bulk-subject', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: [], subject_id: 4 }),
    });

    expect(response.status).toBe(400);
    expect(db.update).not.toHaveBeenCalled();
  });
});
