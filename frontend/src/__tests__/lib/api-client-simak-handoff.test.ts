import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchSimakHandoffUrl } from '@/api/client';

// Serah-terima ke SIMAK (Hub Murid Tahap 4): klien memanggil endpoint murid
// RUAS dengan token sesi yang aktif dan mengembalikan URL dari SIMAK;
// kegagalan hilir diteruskan sebagai galat berkode "simak_unavailable" agar
// pemanggil bisa menampilkan pesan lembut yang tetap.

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem('auth_token', 'token-uji');
});

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('fetchSimakHandoffUrl', () => {
  it('posts to the student handoff endpoint with the session token and returns the URL', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { url: 'https://simak.example/masuk-ruas/token-abc' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchSimakHandoffUrl()).resolves.toBe('https://simak.example/masuk-ruas/token-abc');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/simak-handoff');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['x-auth-token']).toBe('token-uji');
  });

  it('surfaces a downstream failure as a simak_unavailable error', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(503, { error: 'simak_unavailable', message: 'SIMAK belum bisa dibuka otomatis saat ini. Silakan buka SIMAK seperti biasa.' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const error = await fetchSimakHandoffUrl().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error & { code?: string }).code).toBe('simak_unavailable');
  });
});
