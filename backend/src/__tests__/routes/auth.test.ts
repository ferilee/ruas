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
});
