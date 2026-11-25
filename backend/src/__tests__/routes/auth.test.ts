import { describe, expect, it } from 'vitest';
import { authRoutes } from '@/routes/auth';
import { getAdminSession } from '@/lib/admin-auth-store';

describe('authRoutes', () => {
  const app = authRoutes('P130100230', 'secret');

  it('accepts the configured username and password', async () => {
    const res = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'P130100230', password: 'secret' }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ token: expect.any(String) });
  });

  it('rejects an incorrect username', async () => {
    const res = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'peserta-lain', password: 'secret' }),
    });

    expect(res.status).toBe(401);
  });

  it('requires both username and password', async () => {
    const res = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'secret' }),
    });

    expect(res.status).toBe(400);
  });

  it('exposes school_name as null when SCHOOL_NAME is not configured', async () => {
    const res = await app.request('http://localhost/');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ school_name: null });
  });
});

describe('authRoutes env-admin lewat form utama', () => {
  const app = authRoutes('P130100230', 'secret', undefined, undefined, 'admin-secret');

  it('menerima username admin + ADMIN_PASSWORD dan menerbitkan token ruang kerja env-admin', async () => {
    const res = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin-secret' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { token: string; admin_token: string; role: string };
    expect(body.token).toEqual(expect.any(String));
    expect(body.role).toBe('admin');
    expect(getAdminSession(body.admin_token)).toMatchObject({ username: 'env-admin', display_name: 'Admin RUAS', role: 'admin' });
  });

  it('menolak password env yang salah untuk username admin', async () => {
    const res = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'bukan-admin-secret' }),
    });

    expect(res.status).toBe(401);
    const body = await res.json() as { admin_token?: string };
    expect(body.admin_token).toBeUndefined();
  });

  it('tidak mencampur ADMIN_PASSWORD dengan password aplikasi biasa', async () => {
    const res = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'secret' }),
    });

    expect(res.status).toBe(401);
  });

  it('tetap aktif bila hanya ADMIN_PASSWORD yang dikonfigurasi', async () => {
    const envOnlyApp = authRoutes('', '', undefined, undefined, 'admin-secret');

    const status = await envOnlyApp.request('http://localhost/');
    expect(status.status).toBe(200);
    await expect(status.json()).resolves.toMatchObject({ auth_enabled: true });

    const res = await envOnlyApp.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin-secret' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { admin_token?: string };
    expect(body.admin_token).toEqual(expect.any(String));
  });
});

describe('authRoutes school name', () => {
  it('exposes the trimmed school_name when configured', async () => {
    const appWithSchool = authRoutes('P130100230', 'secret', undefined, '  SMKN Pasirian  ');
    const res = await appWithSchool.request('http://localhost/');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ school_name: 'SMKN Pasirian' });
  });

  it('treats a whitespace-only school name as unconfigured', async () => {
    const appWithBlankSchool = authRoutes('P130100230', 'secret', undefined, '   ');
    const res = await appWithBlankSchool.request('http://localhost/');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ school_name: null });
  });
});
