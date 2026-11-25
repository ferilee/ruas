import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminLoginFromSession } from '@/api/client';

// Jembatan sesi menentukan keadaan /admin tanpa formulir login kedua:
// hasilnya dipetakan AdminView menjadi ruang kerja, pantulan ke /auth,
// atau pemberitahuan tanpa akses.

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const editorSession = {
  username: 'guru1',
  display_name: 'Guru Satu',
  role: 'editor',
  subject_id: 3,
  class_id: 2,
  class_ids: [2],
};

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('adminLoginFromSession', () => {
  it('reports no-main-session without calling the server when there is no main token', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(adminLoginFromSession()).resolves.toEqual({ status: 'no-main-session' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stores the admin token and returns the session on success', async () => {
    sessionStorage.setItem('auth_token', 'token-utama');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { token: 'token-admin', session: editorSession })));

    await expect(adminLoginFromSession()).resolves.toEqual({ status: 'ok', session: editorSession });
    expect(sessionStorage.getItem('admin_token')).toBe('token-admin');
  });

  it('maps an invalid main session (401) to no-main-session', async () => {
    sessionStorage.setItem('auth_token', 'token-basi');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(401, { error: 'unauthorized', message: 'Sesi login utama tidak ditemukan.' })));

    await expect(adminLoginFromSession()).resolves.toEqual({ status: 'no-main-session' });
    expect(sessionStorage.getItem('admin_token')).toBeNull();
  });

  it('maps password_change_required so the view can route to the main form', async () => {
    sessionStorage.setItem('auth_token', 'token-utama');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(403, { error: 'password_change_required', message: 'Ganti sandi awal terlebih dahulu.' })));

    await expect(adminLoginFromSession()).resolves.toEqual({ status: 'password-change-required', message: 'Ganti sandi awal terlebih dahulu.' });
  });

  it('maps participant accounts to no-access with the server message', async () => {
    sessionStorage.setItem('auth_token', 'token-utama');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(403, { error: 'unauthorized', message: 'Akun ini tidak memiliki akses editor.' })));

    await expect(adminLoginFromSession()).resolves.toEqual({ status: 'no-access', message: 'Akun ini tidak memiliki akses editor.' });
  });

  it('reports a network failure as error', async () => {
    sessionStorage.setItem('auth_token', 'token-utama');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('jaringan putus'); }));

    await expect(adminLoginFromSession()).resolves.toEqual({ status: 'error', message: 'Tidak dapat terhubung ke server.' });
  });
});
