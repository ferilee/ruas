import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// Helper murni untuk jembatan internal SIMAK <-> RUAS (Hub Murid Tahap 2).
// Berkas ini tidak menyentuh basis data atau env agar seluruh keputusan
// keamanan (hash token, banding rahasia konstan-waktu, kelayakan penukaran,
// pemilihan skor, status asesmen, pembatas percobaan gagal) dapat diuji
// langsung sebagai fungsi murni.

export const HANDOFF_TOKEN_TTL_MS = 60_000;
export const HANDOFF_TOKEN_BYTES = 32; // 256 bit, di atas syarat minimum 128 bit.

export function generateHandoffToken(): string {
  return randomBytes(HANDOFF_TOKEN_BYTES).toString('base64url');
}

export function hashHandoffToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

// Banding rahasia secara konstan-waktu. Kedua sisi di-hash dulu agar
// timingSafeEqual selalu membandingkan panjang yang sama (32 byte) dan
// panjang rahasia asli tidak bocor lewat waktu respons.
export function secretsMatch(provided: string, expected: string): boolean {
  const providedDigest = createHash('sha256').update(provided, 'utf8').digest();
  const expectedDigest = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

export type HandoffTarget =
  | { type: 'dashboard' }
  | { type: 'topic'; topic_id: number; subject_id?: number | null };

export interface HandoffTokenRow {
  username: string;
  target_type: string;
  target_topic_id: number | null;
  target_subject_id: number | null;
  expires_at: Date | string;
  used_at: Date | string | null;
}

export type RedemptionDecision =
  | { ok: true; username: string; target: HandoffTarget }
  | { ok: false; reason: 'not_found' | 'already_used' | 'expired' | 'invalid_target' };

// Keputusan penukaran token: baris harus ada, belum pernah dipakai, dan
// belum kedaluwarsa pada saat penukaran. Penandaan terpakai dilakukan
// pemanggil secara atomik (UPDATE ... WHERE used_at IS NULL).
export function evaluateRedemption(row: HandoffTokenRow | null | undefined, now: Date): RedemptionDecision {
  if (!row) return { ok: false, reason: 'not_found' };
  if (row.used_at) return { ok: false, reason: 'already_used' };
  if (toDate(row.expires_at).getTime() <= now.getTime()) return { ok: false, reason: 'expired' };

  if (row.target_type === 'topic') {
    if (!row.target_topic_id || row.target_topic_id <= 0) return { ok: false, reason: 'invalid_target' };
    return {
      ok: true,
      username: row.username,
      target: { type: 'topic', topic_id: row.target_topic_id, subject_id: row.target_subject_id ?? null },
    };
  }
  return { ok: true, username: row.username, target: { type: 'dashboard' } };
}

// Jalur frontend RUAS untuk sebuah target serah-terima. Pola URL mengikuti
// tautan kuis yang sudah dipakai penugasan SIMAK: /quiz/<id-topik>?subject_id=<id-mapel>.
export function handoffTargetPath(target: HandoffTarget): string {
  if (target.type === 'topic') {
    const query = target.subject_id ? `?subject_id=${target.subject_id}` : '';
    return `/quiz/${target.topic_id}${query}`;
  }
  return '/';
}

export interface FinishedAttemptRow {
  identity_key: string;
  final_score: number;
  completed_at: Date | string | null;
}

// Baris-baris attempt selesai HARUS datang terurut dari yang paling akhir
// selesai (completed_at DESC, id DESC); entri pertama per username adalah
// attempt selesai terakhirnya — bukan skor terbaik (keputusan pemilik).
export function firstFinishedPerUser<T extends FinishedAttemptRow>(rows: T[]): Map<string, T> {
  const result = new Map<string, T>();
  for (const row of rows) {
    if (!result.has(row.identity_key)) result.set(row.identity_key, row);
  }
  return result;
}

export type AssessmentStatus = 'not_started' | 'in_progress' | 'finished';

export interface AttemptStatusRow {
  status: string;
  final_score: number;
  completed_at: Date | string | null;
}

// Susun status satu topik untuk satu murid dari attempt-attempt miliknya
// pada topik itu (sudah disaring mapel oleh pemanggil bila diminta):
// selesai bila ada attempt completed (skor dari yang terakhir selesai),
// sedang bila ada attempt in_progress, selain itu belum mulai.
export function composeAssessmentStatus(attempts: AttemptStatusRow[]): {
  status: AssessmentStatus;
  score: number | null;
  finished_at: string | null;
} {
  let latestFinished: AttemptStatusRow | null = null;
  let hasInProgress = false;

  for (const attempt of attempts) {
    if (attempt.status === 'completed') {
      if (!latestFinished || toTime(attempt.completed_at) >= toTime(latestFinished.completed_at)) {
        latestFinished = attempt;
      }
    } else if (attempt.status === 'in_progress') {
      hasInProgress = true;
    }
  }

  if (latestFinished) {
    return { status: 'finished', score: latestFinished.final_score, finished_at: toIsoString(latestFinished.completed_at) };
  }
  if (hasInProgress) return { status: 'in_progress', score: null, finished_at: null };
  return { status: 'not_started', score: null, finished_at: null };
}

export function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function toIsoString(value: Date | string | null): string | null {
  if (!value) return null;
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toTime(value: Date | string | null): number {
  if (!value) return 0;
  const time = toDate(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

// Pembatas sederhana percobaan penukaran yang gagal, per kunci (alamat IP).
// Sesudah ambang kegagalan dalam jendela waktu, percobaan berikutnya dari
// kunci itu ditolak sampai jendelanya berlalu. Perilaku luar tetap sama
// (dialihkan ke halaman login) — pembatas hanya memutus pencarian token.
export interface FailedAttemptLimiter {
  isBlocked(key: string, now?: Date): boolean;
  recordFailure(key: string, now?: Date): void;
  reset(key: string): void;
}

export function createFailedAttemptLimiter(options?: { maxFailures?: number; windowMs?: number }): FailedAttemptLimiter {
  const maxFailures = options?.maxFailures ?? 10;
  const windowMs = options?.windowMs ?? 10 * 60_000;
  const failures = new Map<string, number[]>();

  function recentFailures(key: string, now: Date): number[] {
    const cutoff = now.getTime() - windowMs;
    const kept = (failures.get(key) ?? []).filter((at) => at > cutoff);
    if (kept.length > 0) failures.set(key, kept);
    else failures.delete(key);
    return kept;
  }

  return {
    isBlocked(key: string, now: Date = new Date()): boolean {
      return recentFailures(key, now).length >= maxFailures;
    },
    recordFailure(key: string, now: Date = new Date()): void {
      const kept = recentFailures(key, now);
      kept.push(now.getTime());
      failures.set(key, kept);
    },
    reset(key: string): void {
      failures.delete(key);
    },
  };
}
