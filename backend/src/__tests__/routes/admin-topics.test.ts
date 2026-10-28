import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createAdminDbMock,
  createAdminTopicMock,
  deleteAdminTopicMock,
  listAdminTopicsMock,
  updateAdminTopicMock,
  updateAdminTopicAccessMock,
} = vi.hoisted(() => ({
  createAdminDbMock: vi.fn(),
  createAdminTopicMock: vi.fn(),
  deleteAdminTopicMock: vi.fn(),
  listAdminTopicsMock: vi.fn(),
  updateAdminTopicMock: vi.fn(),
  updateAdminTopicAccessMock: vi.fn(),
}));

vi.mock('@/services/admin-question-service', () => ({
  createAdminDb: createAdminDbMock,
  createAdminTopic: createAdminTopicMock,
  deleteAdminTopic: deleteAdminTopicMock,
  listAdminTopics: listAdminTopicsMock,
  updateAdminTopic: updateAdminTopicMock,
  updateAdminTopicAccess: updateAdminTopicAccessMock,
}));

describe('adminTopicsRoutes CRUD', () => {
  beforeEach(() => {
    createAdminDbMock.mockReset().mockReturnValue({});
    createAdminTopicMock.mockReset();
    deleteAdminTopicMock.mockReset();
    listAdminTopicsMock.mockReset();
    updateAdminTopicMock.mockReset();
    updateAdminTopicAccessMock.mockReset();
  });

  it('creates a topic with a valid import slug', async () => {
    createAdminTopicMock.mockResolvedValue(7);
    const { adminTopicsRoutes } = await import('@/routes/admin-topics');
    const app = adminTopicsRoutes({} as never);

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id: 2, slug: 'barisan-dan-deret', label: 'Barisan dan Deret', display_order: 1 }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: 7 });
    expect(createAdminTopicMock).toHaveBeenCalledWith({}, { subject_id: 2, slug: 'barisan-dan-deret', label: 'Barisan dan Deret', display_order: 1, class_ids: [] });
  });

  it('rejects slugs that are not URL-safe', async () => {
    const { adminTopicsRoutes } = await import('@/routes/admin-topics');
    const app = adminTopicsRoutes({} as never);

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id: 2, slug: 'Barisan Dan Deret', label: 'Barisan dan Deret', display_order: 1 }),
    });

    expect(response.status).toBe(400);
    expect(createAdminTopicMock).not.toHaveBeenCalled();
  });

  it('protects topics that already have exam history', async () => {
    deleteAdminTopicMock.mockResolvedValue('in_use');
    const { adminTopicsRoutes } = await import('@/routes/admin-topics');
    const app = adminTopicsRoutes({} as never);

    const response = await app.request('http://localhost/7', { method: 'DELETE' });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'in_use',
      message: 'Topik sudah dipakai dalam riwayat asesmen dan tidak dapat dihapus.',
    });
  });
});

describe('adminTopicsRoutes field errors (RUAS-002)', () => {
  it('returns per-field errors when the topic body is invalid', async () => {
    const { adminTopicsRoutes } = await import('@/routes/admin-topics');
    const app = adminTopicsRoutes({} as never);

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id: 2, slug: 'Tidak Valid!', label: '', display_order: 1 }),
    });

    expect(response.status).toBe(400);
    const body = await response.json() as { error: string; fields: Record<string, string> };
    expect(body.error).toBe('invalid_body');
    expect(body.fields.slug).toBeTruthy();
    expect(body.fields.label).toBeTruthy();
  });

  it('pins duplicate slug errors to the slug field', async () => {
    createAdminTopicMock.mockRejectedValue(Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' }));
    const { adminTopicsRoutes } = await import('@/routes/admin-topics');
    const app = adminTopicsRoutes({} as never);

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id: 2, slug: 'barisan-dan-deret', label: 'Barisan dan Deret', display_order: 1 }),
    });

    expect(response.status).toBe(409);
    const body = await response.json() as { error: string; fields: Record<string, string> };
    expect(body.error).toBe('duplicate_slug');
    expect(body.fields.slug).toContain('sudah digunakan');
  });
});
