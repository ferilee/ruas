import { describe, expect, it } from 'vitest';
import { examExitRoutes } from '@/routes/exam-exit';

describe('examExitRoutes', () => {
  it('authorizes the configured supervisor password', async () => {
    const app = examExitRoutes('pengawas-rahasia');
    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'pengawas-rahasia' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authorized: true });
  });

  it('rejects an incorrect supervisor password without ending the participant session', async () => {
    const app = examExitRoutes('pengawas-rahasia');
    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'salah' }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'invalid_exit_password',
      message: 'Kata sandi pengawas salah.',
    });
  });
});
