import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashTopicToken } from '@/lib/topic-token';

const { drizzleMock } = vi.hoisted(() => ({
  drizzleMock: vi.fn(),
}));

vi.mock('drizzle-orm/mysql2', () => ({
  drizzle: drizzleMock,
}));

describe('topicsRoutes', () => {
  beforeEach(() => {
    drizzleMock.mockReset();
  });

  it('rejects invalid subject_id', async () => {
    const { topicsRoutes } = await import('@/routes/topics.js');
    const app = topicsRoutes({} as never);
    const res = await app.request('http://localhost/?subject_id=abc');

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: 'invalid_query',
      message: 'subject_id harus berupa angka positif.',
    });
  });

  it('returns topics with question_count', async () => {
    drizzleMock.mockReturnValue({
      select: () => ({
        from: () => ({
          leftJoin: () => ({
            leftJoin: () => ({
              leftJoin: () => ({
                leftJoin: () => ({
                  where: () => ({
                    groupBy: () => ({
                      orderBy: async () => [{
                        id: 2,
                        subject_id: 1,
                        class_id: 4,
                        class_label: 'Kelas 11 TKJ A',
                        slug: 'penalaran-umum',
                        label: 'Penalaran Umum',
                        display_order: 1,
                        requires_token: false,
                        question_count: 10,
                      }],
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    });

    const { topicsRoutes } = await import('@/routes/topics.js');
    const app = topicsRoutes({} as never);
    const res = await app.request('http://localhost/?subject_id=1');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      topics: [
        {
          id: 2,
          subject_id: 1,
          class_id: 4,
          class_label: 'Kelas 11 TKJ A',
          slug: 'penalaran-umum',
          label: 'Penalaran Umum',
          display_order: 1,
          requires_token: false,
          question_count: 10,
        },
      ],
    });
  });

  it('grants access with the configured topic token', async () => {
    drizzleMock.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 2, requires_token: true, token_hash: hashTopicToken('RUAS-2026') }],
          }),
        }),
      }),
    });

    const { topicsRoutes } = await import('@/routes/topics.js');
    const app = topicsRoutes({} as never);
    const res = await app.request('http://localhost/2/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'RUAS-2026' }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ granted: true });
  });

  it('rejects an incorrect topic token', async () => {
    drizzleMock.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 2, requires_token: true, token_hash: hashTopicToken('RUAS-2026') }],
          }),
        }),
      }),
    });

    const { topicsRoutes } = await import('@/routes/topics.js');
    const app = topicsRoutes({} as never);
    const res = await app.request('http://localhost/2/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'SALAH' }),
    });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: 'invalid_topic_token', message: 'Token topik salah atau sudah tidak berlaku.' });
  });
});
