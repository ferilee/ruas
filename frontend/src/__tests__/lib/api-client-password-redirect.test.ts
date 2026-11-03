import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchParticipantProfile } from '@/api/client';

// Regresi bootloop /change-password: request() dulu selalu menjalankan
// window.location.href = '/change-password' pada 403 password_change_required,
// termasuk saat halaman aktif memang sudah /change-password. App.vue memanggil
// profil pada setiap mount, jadi halaman itu memuat ulang dirinya tanpa henti.

type LocationStub = {
  pathname: string;
  hrefAssignments: string[];
};

function stubLocation(pathname: string): LocationStub {
  const stub: LocationStub = { pathname, hrefAssignments: [] };
  const locationObject = {
    pathname,
    origin: 'http://localhost',
    get href() {
      return stub.hrefAssignments[stub.hrefAssignments.length - 1] ?? `http://localhost${pathname}`;
    },
    set href(value: string) {
      stub.hrefAssignments.push(value);
    },
  };
  Object.defineProperty(window, 'location', { value: locationObject, configurable: true, writable: true });
  return stub;
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const originalLocation = window.location;

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem('auth_token', 'token-uji');
});

afterEach(() => {
  Object.defineProperty(window, 'location', { value: originalLocation, configurable: true, writable: true });
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('request() — pengalihan password_change_required', () => {
  it('tidak menavigasi bila sudah di /change-password, error tetap terlempar', async () => {
    const location = stubLocation('/change-password');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(403, { error: 'password_change_required', message: 'Silakan ubah sandi terlebih dahulu.' })));

    await expect(fetchParticipantProfile()).rejects.toMatchObject({ code: 'password_change_required' });
    expect(location.hrefAssignments).toEqual([]);
  });

  it('tetap menavigasi ke /change-password dari halaman lain', async () => {
    const location = stubLocation('/');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(403, { error: 'password_change_required', message: 'Silakan ubah sandi terlebih dahulu.' })));

    await expect(fetchParticipantProfile()).rejects.toMatchObject({ code: 'password_change_required' });
    expect(location.hrefAssignments).toEqual(['/change-password']);
  });

  it('respons sukses mengembalikan data seperti biasa tanpa navigasi', async () => {
    const location = stubLocation('/change-password');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { profile: { name: 'Siswa Uji' } })));

    await expect(fetchParticipantProfile()).resolves.toMatchObject({ name: 'Siswa Uji' });
    expect(location.hrefAssignments).toEqual([]);
  });

  it('401 tetap membersihkan token dan menavigasi ke /auth', async () => {
    const location = stubLocation('/change-password');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(401, { error: 'unauthorized' })));

    await expect(fetchParticipantProfile()).rejects.toMatchObject({ code: 'unauthorized' });
    expect(location.hrefAssignments).toEqual(['/auth']);
    expect(sessionStorage.getItem('auth_token')).toBeNull();
  });
});
