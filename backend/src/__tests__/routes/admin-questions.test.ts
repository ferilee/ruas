import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createAdminDbMock, deleteAdminQuestionMock, listAdminQuestionsMock } = vi.hoisted(() => ({
  createAdminDbMock: vi.fn(),
  deleteAdminQuestionMock: vi.fn(),
  listAdminQuestionsMock: vi.fn(),
}));

vi.mock('@/services/admin-question-service', () => ({
  createAdminDb: createAdminDbMock,
  createAdminQuestion: vi.fn(),
  deleteAdminQuestion: deleteAdminQuestionMock,
  findAdminQuestion: vi.fn(),
  importAdminQuestions: vi.fn(),
  listAdminQuestions: listAdminQuestionsMock,
  updateAdminQuestion: vi.fn(),
}));

describe('adminQuestionRoutes delete', () => {
  beforeEach(() => {
    createAdminDbMock.mockReset().mockReturnValue({});
    deleteAdminQuestionMock.mockReset();
    listAdminQuestionsMock.mockReset();
  });

  it('returns a paginated question list using server-side filters', async () => {
    listAdminQuestionsMock.mockResolvedValue({ questions: [], page: 2, page_size: 50, total: 75, total_pages: 2 });
    const { adminQuestionRoutes } = await import('@/routes/admin-questions');
    const app = adminQuestionRoutes({} as never);

    const response = await app.request('http://localhost/?search=geometri&topic_id=4&type=single_choice&difficulty=medium&page=2&page_size=50');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ questions: [], page: 2, page_size: 50, total: 75, total_pages: 2 });
    expect(listAdminQuestionsMock).toHaveBeenCalledWith({}, {
      search: 'geometri',
      topic_id: 4,
      type: 'single_choice',
      difficulty: 'medium',
      page: 2,
      page_size: 50,
    });
  });

  it('explains why a question with exam history cannot be deleted', async () => {
    deleteAdminQuestionMock.mockResolvedValue('in_use');
    const { adminQuestionRoutes } = await import('@/routes/admin-questions');
    const app = adminQuestionRoutes({} as never);

    const response = await app.request('http://localhost/12', { method: 'DELETE' });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'question_in_use',
      message: 'Soal tidak dapat dihapus karena sudah digunakan dalam riwayat asesmen. Hapus soal akan merusak laporan peserta.',
    });
  });

  it('deletes a question that has no exam history', async () => {
    deleteAdminQuestionMock.mockResolvedValue('deleted');
    const { adminQuestionRoutes } = await import('@/routes/admin-questions');
    const app = adminQuestionRoutes({} as never);

    const response = await app.request('http://localhost/12', { method: 'DELETE' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deleted: true });
  });
});
