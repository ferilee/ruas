import { Hono } from 'hono';
import { requestSimakHandoffUrl } from '../lib/simak-open';

// Endpoint sisi murid untuk tombol "Buka SIMAK" di beranda RUAS (Hub Murid
// Tahap 4, rancangan bagian 5). Rute ini dipasang di belakang middleware
// autentikasi peserta yang sama dengan rute murid lain, dan username SELALU
// diambil dari sesi RUAS yang aktif (authUsername) — badan permintaan dari
// klien tidak pernah dibaca, jadi klien tidak bisa meminta serah-terima
// untuk akun lain.
//
// Sukses menjawab { url } untuk dinavigasikan peramban. Semua kegagalan
// hilir (env SIMAK_INTERNAL_URL/SIMAK_INTERNAL_SECRET belum disetel, SIMAK
// tak terjangkau, jawaban bukan 200) diringkas menjadi satu galat ramah
// 503 berkode "simak_unavailable" tanpa rincian teknis apa pun.

export interface SimakOpenRoutesOptions {
  simakInternalUrl?: string;
  simakInternalSecret?: string;
  fetchFn?: typeof fetch;
}

export function simakOpenRoutes(options: SimakOpenRoutesOptions) {
  const app = new Hono();

  app.post('/', async (c) => {
    const username = c.get('authUsername');
    if (!username) {
      return c.json({ error: 'unauthorized', message: 'Akses ditolak. Silakan login.' }, 401);
    }

    const result = await requestSimakHandoffUrl({
      baseUrl: options.simakInternalUrl,
      secret: options.simakInternalSecret,
      username,
      fetchFn: options.fetchFn,
    });

    if (!result.ok) {
      return c.json(
        { error: 'simak_unavailable', message: 'SIMAK belum bisa dibuka otomatis saat ini. Silakan buka SIMAK seperti biasa.' },
        503,
      );
    }

    return c.json({ url: result.url });
  });

  return app;
}
