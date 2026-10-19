import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createTeacherRequestDbMock,
  createTeacherAccessRequestMock,
  listTeacherAccessRequestsMock,
  reviewTeacherAccessRequestMock,
  getAdminSessionMock,
} = vi.hoisted(() => ({
  createTeacherRequestDbMock: vi.fn(),
  createTeacherAccessRequestMock: vi.fn(),
  listTeacherAccessRequestsMock: vi.fn(),
  reviewTeacherAccessRequestMock: vi.fn(),
  getAdminSessionMock: vi.fn(),
}));

vi.mock('@/services/teacher-access-request-service', () => ({
  createTeacherRequestDb: createTeacherRequestDbMock,
  createTeacherAccessRequest: createTeacherAccessRequestMock,
  listTeacherAccessRequests: listTeacherAccessRequestsMock,
  reviewTeacherAccessRequest: reviewTeacherAccessRequestMock,
}));

vi.mock('@/lib/admin-auth-store', () => ({ getAdminSession: getAdminSessionMock }));

describe('teacher access request routes', () => {
  beforeEach(() => {
    createTeacherRequestDbMock.mockReset().mockReturnValue({});
    createTeacherAccessRequestMock.mockReset();
    listTeacherAccessRequestsMock.mockReset();
    reviewTeacherAccessRequestMock.mockReset();
    getAdminSessionMock.mockReset();
  });

  it('accepts a valid public teacher request', async () => {
    createTeacherAccessRequestMock.mockResolvedValue(12);
    const { teacherAccessRequestRoutes } = await import('@/routes/teacher-access-requests');
    const app = teacherAccessRequestRoutes({} as never);

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'guru.matematika', display_name: 'Guru Matematika', password: 'rahasia123', confirm_password: 'rahasia123' }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ request: { id: 12, status: 'pending' } });
    expect(createTeacherAccessRequestMock).toHaveBeenCalledWith({}, expect.objectContaining({ username: 'guru.matematika', contact: null }));
  });

  it('rejects mismatched passwords before touching the service', async () => {
    const { teacherAccessRequestRoutes } = await import('@/routes/teacher-access-requests');
    const app = teacherAccessRequestRoutes({} as never);
    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'guru.matematika', display_name: 'Guru Matematika', password: 'rahasia123', confirm_password: 'berbeda123' }),
    });

    expect(response.status).toBe(400);
    expect(createTeacherAccessRequestMock).not.toHaveBeenCalled();
  });

  it('lets Admin approve a pending request', async () => {
    getAdminSessionMock.mockReturnValue({ username: 'admin', display_name: 'Admin', role: 'admin', subject_id: null, class_id: null });
    reviewTeacherAccessRequestMock.mockResolvedValue('approved');
    const { adminTeacherRequestRoutes } = await import('@/routes/admin-teacher-requests');
    const app = adminTeacherRequestRoutes({} as never);

    const response = await app.request('http://localhost/12', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': 'admin-token' },
      body: JSON.stringify({ action: 'approve' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'approved' });
    expect(reviewTeacherAccessRequestMock).toHaveBeenCalledWith({}, 12, 'approve', 'admin', null);
  });

  it('blocks Editor from reviewing requests', async () => {
    getAdminSessionMock.mockReturnValue({ username: 'guru', display_name: 'Guru', role: 'editor', subject_id: null, class_id: null });
    const { adminTeacherRequestRoutes } = await import('@/routes/admin-teacher-requests');
    const app = adminTeacherRequestRoutes({} as never);
    const response = await app.request('http://localhost/', { headers: { 'x-admin-token': 'editor-token' } });

    expect(response.status).toBe(403);
    expect(listTeacherAccessRequestsMock).not.toHaveBeenCalled();
  });
});
