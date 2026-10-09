import { beforeEach, describe, expect, it, vi } from 'vitest';

const { drizzleMock } = vi.hoisted(() => ({
  drizzleMock: vi.fn(),
}));

vi.mock('drizzle-orm/mysql2', () => ({
  drizzle: drizzleMock,
}));

describe('curriculumRoutes', () => {
  beforeEach(() => {
    vi.resetModules();
    drizzleMock.mockReset();
  });

  it('returns classes, assessment types, and subjects', async () => {
    const queries = [
      [{ id: 1, slug: 'kelas-10', label: 'Kelas 10', display_order: 1 }],
      [{ id: 1, slug: 'asesmen-ruas', label: 'Asesmen Ruas', display_order: 1 }],
      [{ id: 1, slug: 'matematika', label: 'Matematika', display_order: 1, class_id: null, assessment_type_id: null }],
    ];
    let queryIndex = 0;
    drizzleMock.mockReturnValue({
      select: () => ({
        from: () => ({
          orderBy: async () => queries[queryIndex++],
        }),
      }),
    });

    const { curriculumRoutes } = await import('@/routes/curriculum');
    const app = curriculumRoutes({} as never);
    const res = await app.request('http://localhost/');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      classes: queries[0],
      assessment_types: queries[1],
      subjects: queries[2],
    });
  });
});

describe('adminCurriculumRoutes', () => {
  beforeEach(() => {
    vi.resetModules();
    drizzleMock.mockReset();
    drizzleMock.mockReturnValue({});
  });

  it('rejects invalid class slugs before touching the database', async () => {
    const { adminCurriculumRoutes } = await import('@/routes/admin-curriculum');
    const app = adminCurriculumRoutes({} as never);
    const res = await app.request('http://localhost/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'Kelas 10', label: 'Kelas 10', display_order: 1 }),
    });

    expect(res.status).toBe(400);
    expect(drizzleMock).toHaveBeenCalledTimes(1);
  });
});
