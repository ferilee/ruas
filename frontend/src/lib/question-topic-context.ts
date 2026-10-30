import type { AdminTopic } from '@/types';

// Konteks topik untuk langkah Soal guru (context-first): guru hampir selalu
// bekerja pada satu topik, jadi pemilih topik menjadi konteks utama dan
// pilihan terakhirnya diingat per pengguna — mengikuti pola kunci
// per-pengguna yang sudah ada ('ruas_teacher_onboarding_dismissed:<username>').
// Saringan topik yang dipakai tetap state questionTopicFilter yang sama di
// AdminView (number = satu topik, null = Semua topik); modul ini hanya
// mengurus penyimpanan, pemulihan, dan pengelompokan opsinya.

export function questionTopicStorageKey(username: string): string {
  return `ruas_teacher_question_topic:${username}`;
}

export type StoredQuestionTopic = number | null | undefined;

// Nilai tersimpan: 'all' adalah pilihan sah "Semua topik" (null), angka
// adalah id topik. Apa pun selain itu (kosong, rusak, bukan angka positif)
// dianggap tidak ada catatan (undefined) agar pemulihan jatuh ke keadaan
// aman yang sama seperti belum pernah memilih.
export function parseStoredQuestionTopic(raw: string | null): StoredQuestionTopic {
  if (raw === null) return undefined;
  const value = raw.trim();
  if (value === '') return undefined;
  if (value === 'all') return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return undefined;
  return id;
}

export function readStoredQuestionTopic(username: string): StoredQuestionTopic {
  try {
    return parseStoredQuestionTopic(localStorage.getItem(questionTopicStorageKey(username)));
  } catch {
    return undefined;
  }
}

export function storeQuestionTopic(username: string, topicId: number | null): void {
  try {
    localStorage.setItem(questionTopicStorageKey(username), topicId === null ? 'all' : String(topicId));
  } catch {
    // Penyimpanan lokal tidak tersedia (mode privat dsb.) — konteks tetap
    // bekerja untuk sesi ini, hanya tidak diingat antar kunjungan.
  }
}

// Pemulihan konteks saat section dimuat: catatan berupa id topik hanya
// dipakai bila topiknya masih ada dan terjangkau; selain itu (tidak ada
// catatan, pilihan "Semua topik", atau topik sudah hilang) hasilnya null
// alias "Semua topik" — keadaan yang tidak pernah menyembunyikan soal
// secara diam-diam di balik topik lain yang tidak dipilih guru.
export function resolveQuestionTopicFilter(stored: StoredQuestionTopic, topics: AdminTopic[]): number | null {
  if (typeof stored !== 'number') return null;
  return topics.some((topic) => topic.id === stored) ? stored : null;
}

export interface QuestionTopicGroup {
  subjectId: number;
  label: string;
  topics: AdminTopic[];
}

// Pengelompokan opsi topik per mata pelajaran, mengikuti pola
// groupedVisibleTopics pada langkah Topik: kelompok mengikuti urutan mata
// pelajaran pada data kurikulum bila daftar subjek diberikan; topik di
// dalam kelompok mengikuti urutan data topik yang diterima.
export function groupQuestionTopicsBySubject(
  topics: AdminTopic[],
  subjects: Array<{ id: number; label: string }> = [],
): QuestionTopicGroup[] {
  const subjectOrder = new Map(subjects.map((subject, index) => [subject.id, index]));
  const groups = new Map<number, QuestionTopicGroup>();
  for (const topic of topics) {
    let group = groups.get(topic.subject_id);
    if (!group) {
      const subject = subjects.find((entry) => entry.id === topic.subject_id);
      group = { subjectId: topic.subject_id, label: subject?.label ?? topic.subject_label, topics: [] };
      groups.set(topic.subject_id, group);
    }
    group.topics.push(topic);
  }
  return [...groups.values()].sort(
    (a, b) => (subjectOrder.get(a.subjectId) ?? Number.MAX_SAFE_INTEGER) - (subjectOrder.get(b.subjectId) ?? Number.MAX_SAFE_INTEGER),
  );
}
