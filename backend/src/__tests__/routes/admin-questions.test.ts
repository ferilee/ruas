import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createAdminDbMock, deleteAdminQuestionMock } = vi.hoisted(() => ({
  createAdminDbMock: vi.fn(),
  deleteAdminQuestionMock: vi.fn(),
}));

vi.mock('@/services/admin-question-service', () => ({
  createAdminDb: createAdminDbMock,
  createAdminQuestion: vi.fn(),
  deleteAdminQuestion: deleteAdminQuestionMock,
  findAdminQuestion: vi.fn(),
  importAdminQuestions: vi.fn(),
  listAdminQuestions: vi.fn(),
  updateAdminQuestion: vi.fn(),
}));

describe('adminQuestionRoutes delete', () => {
  beforeEach(() => {
    createAdminDbMock.mockReset().mockReturnValue({});
    deleteAdminQuestionMock.mockReset();
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
