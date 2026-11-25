import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import AuthView from '@/views/AuthView.vue';
import { AUTH_RETURN_DESTINATION_KEY, saveAuthReturnDestination } from '@/lib/auth-redirect';

// Satu form login untuk semua: form utama ini melayani murid, guru/editor,
// dan admin bawaan (env-admin), serta mengembalikan pengguna ke tujuan
// yang tersimpan (mis. /admin) sesudah login berhasil.

const { fetchDemoAvailability, fetchParticipantProfile, push, replace } = vi.hoisted(() => ({
  fetchDemoAvailability: vi.fn(),
  fetchParticipantProfile: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@/api/client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/client')>();
  return {
    ...original,
    fetchDemoAvailability,
    fetchParticipantProfile,
    saveParticipantProfile: vi.fn(async () => null),
  };
});

vi.mock('vue-router', async (importOriginal) => {
  const original = await importOriginal<typeof import('vue-router')>();
  return {
    ...original,
    useRouter: () => ({ push, replace }),
    useRoute: () => ({ query: {} }),
  };
});

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

let loginResponseBody: Record<string, unknown>;

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(async (input: unknown, init?: { method?: string }) => {
    const url = String(input);
    if (url.includes('/api/auth') && init?.method === 'POST') return jsonResponse(200, loginResponseBody);
    if (url.includes('/api/auth')) return jsonResponse(200, { auth_enabled: true });
    throw new Error(`fetch tak terduga: ${url}`);
  }));
}

async function mountAndLogin() {
  const wrapper = mount(AuthView);
  await flushPromises();
  await wrapper.find('input[aria-label="Username"]').setValue('pengguna');
  await wrapper.find('input[aria-label="Password"]').setValue('sandi-rahasia');
  await wrapper.find('form.auth-form').trigger('submit');
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  push.mockReset();
  replace.mockReset();
  fetchDemoAvailability.mockReset();
  fetchDemoAvailability.mockResolvedValue(false);
  fetchParticipantProfile.mockReset();
  fetchParticipantProfile.mockResolvedValue({ is_complete: true, subject_id: 7 });
  loginResponseBody = { token: 'token-utama', role: 'participant' };
  stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('AuthView tujuan kembali sesudah login', () => {
  it('mengembalikan pengguna ke tujuan tersimpan, mendahului pendaratan profil biasa', async () => {
    saveAuthReturnDestination('/admin?section=schedule');

    await mountAndLogin();

    expect(push).toHaveBeenCalledWith('/admin?section=schedule');
    expect(sessionStorage.getItem(AUTH_RETURN_DESTINATION_KEY)).toBeNull();
    expect(fetchParticipantProfile).not.toHaveBeenCalled();
  });

  it('memakai pendaratan biasa bila tidak ada tujuan tersimpan', async () => {
    await mountAndLogin();

    expect(push).toHaveBeenCalledWith('/');
  });

  it('menyimpan admin_token env-admin dari server dan menuju /admin', async () => {
    loginResponseBody = { token: 'token-utama', admin_token: 'token-ruang-kerja', role: 'admin' };

    await mountAndLogin();

    expect(sessionStorage.getItem('admin_token')).toBe('token-ruang-kerja');
    expect(push).toHaveBeenCalledWith('/admin');
    expect(fetchParticipantProfile).not.toHaveBeenCalled();
  });

  it('env-admin dengan tujuan tersimpan kembali ke tujuan itu', async () => {
    saveAuthReturnDestination('/admin?section=users');
    loginResponseBody = { token: 'token-utama', admin_token: 'token-ruang-kerja', role: 'admin' };

    await mountAndLogin();

    expect(push).toHaveBeenCalledWith('/admin?section=users');
  });

  it('meneruskan tujuan tersimpan ke alur ganti sandi wajib untuk guru/admin', async () => {
    saveAuthReturnDestination('/admin?section=users');
    loginResponseBody = { token: 'token-utama', role: 'editor', must_change_password: true };

    await mountAndLogin();

    expect(sessionStorage.getItem('ruas_after_password_change')).toBe('/admin?section=users');
    expect(push).toHaveBeenCalledWith('/change-password');
  });

  it('tidak lagi menampilkan tautan Akses Editor pada kartu login', async () => {
    const wrapper = mount(AuthView);
    await flushPromises();

    expect(wrapper.find('.editor-access').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Akses Editor');
  });
});
