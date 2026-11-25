import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import AdminView from '@/views/AdminView.vue';
import { AUTH_RETURN_DESTINATION_KEY } from '@/lib/auth-redirect';

// Satu form login untuk semua: /admin tidak lagi punya formulir sendiri.
// Uji ini mematok tiga keadaan belum-terotentikasi: memantul ke /auth,
// pemberitahuan tanpa akses untuk akun murid, dan ruang kerja via jembatan.

const {
  fetchAdminAuthStatus,
  adminLoginFromSession,
  replace,
  push,
  routeState,
} = vi.hoisted(() => ({
  fetchAdminAuthStatus: vi.fn(),
  adminLoginFromSession: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  routeState: { current: { query: {} as Record<string, unknown>, fullPath: '/admin' } },
}));

vi.mock('@/api/client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/client')>();
  return {
    ...original,
    fetchAdminAuthStatus,
    adminLoginFromSession,
    fetchAdminQuestions: vi.fn(async () => ({ questions: [], page: 1, page_size: 20, total: 0, total_pages: 1 })),
    fetchAdminTopics: vi.fn(async () => []),
    fetchAdminSchedule: vi.fn(async () => []),
    fetchAdminCurriculum: vi.fn(async () => ({ classes: [], assessment_types: [], subjects: [] })),
    fetchAdminParticipantCount: vi.fn(async () => 0),
    fetchAdminUsers: vi.fn(async () => []),
  };
});

vi.mock('@/lib/admin-realtime', () => ({
  connectAdminRealtime: () => () => {},
  dispatchAdminRealtimeEvent: () => {},
}));

vi.mock('vue-router', async (importOriginal) => {
  const original = await importOriginal<typeof import('vue-router')>();
  return {
    ...original,
    useRouter: () => ({ replace, push }),
    useRoute: () => routeState.current,
  };
});

const adminSession = {
  username: 'admin1',
  display_name: 'Admin Satu',
  role: 'admin',
  subject_id: null,
  class_id: null,
  class_ids: [],
};

beforeEach(() => {
  sessionStorage.clear();
  fetchAdminAuthStatus.mockReset();
  adminLoginFromSession.mockReset();
  replace.mockReset();
  push.mockReset();
  routeState.current = { query: {}, fullPath: '/admin' };
  fetchAdminAuthStatus.mockResolvedValue({ enabled: true, session: null });
});

describe('AdminView tanpa formulir login khusus', () => {
  it('memantul ke /auth dan menyimpan tujuan kembali bila belum ada sesi utama', async () => {
    routeState.current = { query: { section: 'users' }, fullPath: '/admin?section=users' };
    adminLoginFromSession.mockResolvedValue({ status: 'no-main-session' });

    const wrapper = mount(AdminView, { shallow: true });
    await flushPromises();

    expect(replace).toHaveBeenCalledWith('/auth');
    expect(sessionStorage.getItem(AUTH_RETURN_DESTINATION_KEY)).toBe('/admin?section=users');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.find('.login-card').exists()).toBe(false);
  });

  it('memantul ke /auth juga bila jembatan meminta ganti sandi wajib', async () => {
    adminLoginFromSession.mockResolvedValue({ status: 'password-change-required', message: 'Ganti sandi awal terlebih dahulu.' });

    mount(AdminView, { shallow: true });
    await flushPromises();

    expect(replace).toHaveBeenCalledWith('/auth');
    expect(sessionStorage.getItem(AUTH_RETURN_DESTINATION_KEY)).toBe('/admin');
  });

  it('menampilkan pemberitahuan tanpa akses untuk akun murid, bukan formulir', async () => {
    adminLoginFromSession.mockResolvedValue({ status: 'no-access', message: 'Akun ini tidak memiliki akses editor.' });

    const wrapper = mount(AdminView, { shallow: true });
    await flushPromises();

    expect(replace).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Akun ini tidak memiliki akses editor.');
    expect(wrapper.text()).toContain('Kembali ke beranda');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.find('input[type="password"]').exists()).toBe(false);
  });

  it('membuka ruang kerja bila jembatan sesi berhasil', async () => {
    adminLoginFromSession.mockResolvedValue({ status: 'ok', session: adminSession });

    const wrapper = mount(AdminView, { shallow: true });
    await flushPromises();

    expect(replace).not.toHaveBeenCalled();
    expect(wrapper.find('.session-identity').text()).toContain('Admin Satu');
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('membuka ruang kerja langsung dari token admin tersimpan yang masih berlaku', async () => {
    fetchAdminAuthStatus.mockResolvedValue({ enabled: true, session: adminSession });

    const wrapper = mount(AdminView, { shallow: true });
    await flushPromises();

    expect(adminLoginFromSession).not.toHaveBeenCalled();
    expect(wrapper.find('.session-identity').text()).toContain('Admin Satu');
  });
});
