import { describe, expect, it } from 'vitest';
import { authRoutes } from '@/routes/auth';

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
