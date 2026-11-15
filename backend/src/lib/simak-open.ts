// Klien keluar RUAS -> SIMAK untuk serah-terima arah sebaliknya (Hub Murid
// Tahap 4, rancangan bagian 5): backend RUAS meminta SIMAK menerbitkan URL
// masuk tanpa login untuk username murid yang sedang login di RUAS.
//
// Kontrak sisi SIMAK: POST {basis}/api/internal/ruas/handoff dengan header
// "x-internal-secret" (rahasia bersama yang sama dengan arah SIMAK -> RUAS)
// dan badan { username } -> 200 { url }. Semua kegagalan (env belum disetel,
// SIMAK tak terjangkau, jawaban bukan 200, badan tidak sesuai) diringkas
// menjadi hasil gagal terstruktur agar pemanggil menjawab ramah tanpa
// membocorkan rincian teknis. Rahasia tidak pernah ditulis ke log.

export type SimakHandoffResult =
  | { ok: true; url: string }
  | { ok: false; reason: 'not_configured' | 'unreachable' | 'rejected' | 'invalid_response' };

export interface SimakHandoffRequestOptions {
  baseUrl?: string | null;
  secret?: string | null;
  username: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export const SIMAK_HANDOFF_TIMEOUT_MS = 5_000;
const SIMAK_HANDOFF_PATH = '/api/internal/ruas/handoff';

export function normalizeSimakBaseUrl(value?: string | null): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}

export async function requestSimakHandoffUrl(options: SimakHandoffRequestOptions): Promise<SimakHandoffResult> {
  const baseUrl = normalizeSimakBaseUrl(options.baseUrl);
  const secret = (options.secret ?? '').trim();
  if (!baseUrl || !secret) {
    return { ok: false, reason: 'not_configured' };
  }

  const doFetch = options.fetchFn ?? fetch;
  let response: Response;
  try {
    response = await doFetch(`${baseUrl}${SIMAK_HANDOFF_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({ username: options.username }),
      signal: AbortSignal.timeout(options.timeoutMs ?? SIMAK_HANDOFF_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, reason: 'unreachable' };
  }

  if (!response.ok) {
    return { ok: false, reason: 'rejected' };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, reason: 'invalid_response' };
  }

  const url = (body as { url?: unknown } | null)?.url;
  // Hanya URL absolut http(s) yang diteruskan ke peramban murid; bentuk lain
  // (skema berbahaya, string kosong, tipe salah) dianggap jawaban tidak sah.
  if (typeof url !== 'string' || !/^https?:\/\/\S+$/.test(url)) {
    return { ok: false, reason: 'invalid_response' };
  }

  return { ok: true, url };
}
