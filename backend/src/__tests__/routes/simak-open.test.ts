import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { simakOpenRoutes } from '@/routes/simak-open';

// Rute murid "Buka SIMAK" (Hub Murid Tahap 4): username hanya boleh datang
// dari sesi RUAS (authUsername yang dipasang middleware autentikasi), tidak
// pernah dari badan/parameter klien; semua kegagalan hilir menjadi satu
// galat ramah 503 tanpa rincian teknis.

const SIMAK_URL = 'https://simak.example/masuk-ruas/token-abc';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function buildApp(sessionUsername: string | null, fetchFn: typeof fetch, overrides?: { simakInternalUrl?: string; simakInternalSecret?: string }) {
  const app = new Hono();
  if (sessionUsername) {
    app.use('*', async (c, next) => {
      c.set('authUsername', sessionUsername);
      await next();
    });
  }
  app.route(
    '/',
    simakOpenRoutes({
      simakInternalUrl: overrides?.simakInternalUrl ?? 'https://simak.example',
      simakInternalSecret: overrides?.simakInternalSecret ?? 'rahasia-uji-bersama',
      fetchFn,
    }),
  );
  return app;
}

function post(app: Hono, body?: unknown) {
  return app.request('http://localhost/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('simakOpenRoutes', () => {
  it('rejects requests without an active RUAS session and never calls SIMAK', async () => {
    const fetchFn = vi.fn();
    const app = buildApp(null, fetchFn as never);
    const res = await post(app, {});
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: 'unauthorized' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('always hands off the session username, ignoring any username sent by the client', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(200, { url: SIMAK_URL }));
    const app = buildApp('siswa-sesi', fetchFn as never);
    const res = await post(app, { username: 'akun-orang-lain' });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ url: SIMAK_URL });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ username: 'siswa-sesi' });
  });

  it('returns the handoff URL on success without requiring a request body', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(200, { url: SIMAK_URL }));
    const app = buildApp('siswa1', fetchFn as never);
    const res = await post(app);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ url: SIMAK_URL });
  });

  it('turns a downstream refusal into the friendly 503 without leaking internals', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(404, { error: 'user_not_found', message: 'Pengguna tidak ditemukan di basis data internal 10.0.0.9' }));
    const app = buildApp('siswa1', fetchFn as never);
    const res = await post(app, {});
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('simak_unavailable');
    expect(body.message).not.toContain('10.0.0.9');
    expect(body.message).not.toContain('user_not_found');
  });

  it('turns a network failure into the same friendly 503', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED 10.0.0.9:443');
    });
    const app = buildApp('siswa1', fetchFn as never);
    const res = await post(app, {});
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('simak_unavailable');
    expect(body.message).not.toContain('ECONNREFUSED');
  });

  it('answers the friendly 503 without calling SIMAK when the bridge is not configured', async () => {
    const fetchFn = vi.fn();
    const app = buildApp('siswa1', fetchFn as never, { simakInternalUrl: '', simakInternalSecret: '' });
    const res = await post(app, {});
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ error: 'simak_unavailable' });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
