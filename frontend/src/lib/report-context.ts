import type { AdminReportRow, AdminTopic } from '@/types';

// Konteks laporan sederhana guru: guru membuka Laporan untuk melihat hasil
// asesmen terakhir yang ia tangani, bukan menyaring dari nol setiap kali.
// Pilihan topik + kelas terakhirnya diingat per pengguna — mengikuti pola
// kunci per-pengguna yang sudah dipakai konteks langkah Soal
// ('ruas_teacher_question_topic:<username>'). Modul ini hanya mengurus
// penyimpanan, pemulihan + validasi, dan penurunan lingkup bawaan;
// saringannya sendiri tetap state filters yang sama di ReportsPanel.

export interface ReportContext {
  topic_id?: number;
  class_id?: number;
}

export function reportContextStorageKey(username: string): string {
  return `ruas_teacher_report_context:${username}`;
}

function toPositiveId(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

// Catatan tersimpan adalah JSON { topic_id?, class_id? }. Apa pun selain
// itu (bukan JSON, bukan objek, id bukan angka positif) diabaikan per
// bidang; catatan yang seluruhnya tidak terbaca dianggap tidak ada.
export function parseStoredReportContext(raw: string | null): ReportContext | undefined {
  if (raw === null || raw.trim() === '') return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined;
  const record = parsed as Record<string, unknown>;
  const context: ReportContext = {};
  const topicId = toPositiveId(record.topic_id);
  if (topicId !== undefined) context.topic_id = topicId;
  const classId = toPositiveId(record.class_id);
  if (classId !== undefined) context.class_id = classId;
  return context;
}

export function readStoredReportContext(username: string): ReportContext | undefined {
  try {
    return parseStoredReportContext(localStorage.getItem(reportContextStorageKey(username)));
  } catch {
    return undefined;
  }
}

export function storeReportContext(username: string, context: ReportContext): void {
  try {
    const record: ReportContext = {};
    if (context.topic_id !== undefined) record.topic_id = context.topic_id;
    if (context.class_id !== undefined) record.class_id = context.class_id;
    localStorage.setItem(reportContextStorageKey(username), JSON.stringify(record));
  } catch {
    // Penyimpanan lokal tidak tersedia (mode privat dsb.) — konteks tetap
    // bekerja untuk sesi ini, hanya tidak diingat antar kunjungan.
  }
}

// Pemulihan: setiap bidang hanya dipakai bila topik/kelasnya masih ada di
// opsi yang benar-benar termuat. Bidang yang basi dibuang satu per satu —
// bukan seluruh catatan — agar pilihan yang masih sah tidak ikut hilang.
export function resolveReportContext(
  stored: ReportContext | undefined,
  topics: Array<Pick<AdminTopic, 'id'>>,
  classes: Array<{ id: number }>,
): ReportContext {
  if (!stored) return {};
  const context: ReportContext = {};
  if (stored.topic_id !== undefined && topics.some((topic) => topic.id === stored.topic_id)) context.topic_id = stored.topic_id;
  if (stored.class_id !== undefined && classes.some((item) => item.id === stored.class_id)) context.class_id = stored.class_id;
  return context;
}

// Lingkup bawaan bila guru belum punya ingatan: topik dari hasil dengan
// waktu selesai (atau mulai, bila belum selesai) paling akhir pada data
// laporan yang termuat tanpa lingkup. Diturunkan murni dari baris yang
// diterima — tidak ada tebakan dari urutan daftar topik. Bila tidak ada
// baris bertopik sama sekali, hasilnya undefined dan panel tetap tanpa
// lingkup seperti sebelumnya.
export function latestReportTopicId(rows: AdminReportRow[]): number | undefined {
  let latest: AdminReportRow | undefined;
  let latestTime = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    if (row.topic_id === null) continue;
    const time = new Date(row.completed_at ?? row.started_at).getTime();
    if (Number.isNaN(time)) continue;
    if (time > latestTime || (time === latestTime && latest !== undefined && row.attempt_id > latest.attempt_id)) {
      latest = row;
      latestTime = time;
    }
  }
  return latest?.topic_id ?? undefined;
}
