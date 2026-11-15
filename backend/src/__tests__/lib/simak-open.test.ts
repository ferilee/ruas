import { describe, expect, it, vi } from 'vitest';
import { normalizeSimakBaseUrl, requestSimakHandoffUrl } from '@/lib/simak-open';

const BASE = 'https://simak.example';
const SECRET = 'rahasia-uji-bersama';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('normalizeSimakBaseUrl', () => {
  it('trims whitespace and trailing slashes', () => {
    expect(normalizeSimakBaseUrl('  https://simak.example/  ')).toBe('https://simak.example');
    expect(normalizeSimakBaseUrl('https://simak.example///')).toBe('https://simak.example');
    expect(normalizeSimakBaseUrl('')).toBe('');
    expect(normalizeSimakBaseUrl(undefined)).toBe('');
    expect(normalizeSimakBaseUrl(null)).toBe('');
  });
});

describe('requestSimakHandoffUrl', () => {
  it('does not call SIMAK at all when the base URL or the secret is not configured', async () => {
    const fetchFn = vi.fn();
    await expect(
      requestSimakHandoffUrl({ baseUrl: '', secret: SECRET, username: 'siswa1', fetchFn }),
    ).resolves.toEqual({ ok: false, reason: 'not_configured' });
    await expect(
      requestSimakHandoffUrl({ baseUrl: BASE, secret: '', username: 'siswa1', fetchFn }),
    ).resolves.toEqual({ ok: false, reason: 'not_configured' });
    await expect(
      requestSimakHandoffUrl({ baseUrl: undefined, secret: undefined, username: 'siswa1', fetchFn }),
    ).resolves.toEqual({ ok: false, reason: 'not_configured' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('posts the username to the locked SIMAK internal contract with the shared secret header', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(200, { url: 'https://simak.example/masuk-ruas/token-abc' }));
    const result = await requestSimakHandoffUrl({ baseUrl: `${BASE}/`, secret: SECRET, username: 'siswa1', fetchFn });
    expect(result).toEqual({ ok: true, url: 'https://simak.example/masuk-ruas/token-abc' });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://simak.example/api/internal/ruas/handoff');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['x-internal-secret']).toBe(SECRET);
    expect(JSON.parse(init.body as string)).toEqual({ username: 'siswa1' });
  });

  it('maps any non-200 answer from SIMAK to a rejected failure', async () => {
    for (const status of [400, 401, 404, 500]) {
      const fetchFn = vi.fn(async () => jsonResponse(status, { error: 'apa-pun' }));
      await expect(
        requestSimakHandoffUrl({ baseUrl: BASE, secret: SECRET, username: 'siswa1', fetchFn }),
      ).resolves.toEqual({ ok: false, reason: 'rejected' });
    }
  });

  it('maps a network failure to an unreachable failure without throwing', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED 10.0.0.9:443');
    });
    await expect(
      requestSimakHandoffUrl({ baseUrl: BASE, secret: SECRET, username: 'siswa1', fetchFn }),
    ).resolves.toEqual({ ok: false, reason: 'unreachable' });
  });

  it('rejects malformed success bodies instead of trusting them', async () => {
    const bodies: unknown[] = [
      {},
      { url: '' },
      { url: 42 },
      { url: 'javascript:alert(1)' },
      { url: '/masuk-ruas/relatif' },
      null,
    ];
    for (const body of bodies) {
      const fetchFn = vi.fn(async () => jsonResponse(200, body));
      await expect(
        requestSimakHandoffUrl({ baseUrl: BASE, secret: SECRET, username: 'siswa1', fetchFn }),
      ).resolves.toEqual({ ok: false, reason: 'invalid_response' });
    }
  });

  it('rejects a success response whose body is not JSON', async () => {
    const fetchFn = vi.fn(
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error('Unexpected token');
          },
        }) as Response,
    );
    await expect(
      requestSimakHandoffUrl({ baseUrl: BASE, secret: SECRET, username: 'siswa1', fetchFn }),
    ).resolves.toEqual({ ok: false, reason: 'invalid_response' });
  });
});
