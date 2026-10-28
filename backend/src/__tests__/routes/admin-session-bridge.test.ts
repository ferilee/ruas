import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUserByUsernameMock, getTokenUsernameMock } = vi.hoisted(() => ({
  findUserByUsernameMock: vi.fn(),
  getTokenUsernameMock: vi.fn(),
}));

vi.mock('@/services/user-service', () => ({
  authenticateUser: vi.fn(),
  createUserDb: () => ({}),
  findUserByUsername: findUserByUsernameMock,
  hasAdminUsers: vi.fn().mockResolvedValue(true),
  listEffectiveUserClassIds: vi.fn().mockResolvedValue([2, 5]),
}));

vi.mock('../../lib/auth-store', () => ({
  getTokenUsername: getTokenUsernameMock,
}));

describe('admin session bridge (RUAS-004)', () => {
  beforeEach(() => {
    findUserByUsernameMock.mockReset();
    getTokenUsernameMock.mockReset();
  });

  it('issues an editor token from a valid main-site session for teachers', async () => {
    getTokenUsernameMock.mockReturnValue('guru1');
    findUserByUsernameMock.mockResolvedValue({
      username: 'guru1', display_name: 'Guru Satu', role: 'editor', subject_id: 3, class_id: 2, must_change_password: 0, is_demo: 0, active: 1,
    });
    const { adminAuthRoutes } = await import('@/routes/admin-auth');
    const app = adminAuthRoutes('admin-secret', {} as never);

    const res = await app.request('http://localhost/session', { method: 'POST', headers: { 'x-auth-token': 'main-token' } });
    expect(res.status).toBe(200);
    const body = await res.json() as { token: string; session: { username: string; role: string; class_ids: number[] } };
    expect(body.token).toBeTruthy();
    expect(body.session).toMatchObject({ username: 'guru1', role: 'editor' });
    expect(body.session.class_ids).toEqual([2, 5]);
  });

  it('rejects requests without a main-site session', async () => {
    getTokenUsernameMock.mockReturnValue(null);
    const { adminAuthRoutes } = await import('@/routes/admin-auth');
    const app = adminAuthRoutes('admin-secret', {} as never);

    const res = await app.request('http://localhost/session', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('rejects participant accounts', async () => {
    getTokenUsernameMock.mockReturnValue('siswa1');
    findUserByUsernameMock.mockResolvedValue({
      username: 'siswa1', display_name: 'Siswa Satu', role: 'participant', subject_id: 3, class_id: 2, must_change_password: 0, is_demo: 0, active: 1,
    });
    const { adminAuthRoutes } = await import('@/routes/admin-auth');
    const app = adminAuthRoutes('admin-secret', {} as never);

    const res = await app.request('http://localhost/session', { method: 'POST', headers: { 'x-auth-token': 'main-token' } });
    expect(res.status).toBe(403);
  });
});
