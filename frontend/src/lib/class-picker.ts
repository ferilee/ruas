export interface ClassPickerOption {
  id: number;
  label: string;
  academic_year: string;
}

export interface ClassPickerGroup {
  /** Kunci kelompok: tahun ajaran persis seperti data, atau '' untuk "Lainnya". */
  key: string;
  /** Label kelompok yang ditampilkan: tahun ajaran, atau "Lainnya". */
  label: string;
  items: ClassPickerOption[];
}

export type GroupSelectionState = 'none' | 'some' | 'all';

/** Label tampilan satu kelas: "Nama · Tahun ajaran", atau nama saja bila tahun kosong. */
export function classOptionLabel(item: ClassPickerOption): string {
  const year = item.academic_year?.trim() ?? '';
  return year ? `${item.label} · ${year}` : item.label;
}

const ROMAN_GRADES: Record<string, number> = { X: 10, XI: 11, XII: 12 };

/**
 * Jenjang yang terbaca dari awalan nama kelas: angka ("10", "11", "12 ...")
 * atau romawi ("X", "XI", "XII ..."). Mengembalikan null bila tidak terbaca.
 */
export function classGradeRank(label: string): number | null {
  const trimmed = label.trim();
  const numeric = /^(\d{1,2})(?=[\s.\-_]|$)/.exec(trimmed);
  if (numeric) return Number.parseInt(numeric[1], 10);
  const roman = /^(XII|XI|X)(?=[\s.\-_]|$)/i.exec(trimmed);
  if (roman) return ROMAN_GRADES[roman[1].toUpperCase()] ?? null;
  return null;
}

/**
 * Kunci urut tahun ajaran: tahun 4 digit apa adanya ("2026/2027" -> 2026),
 * format pendek dua digit dianggap abad 2000 ("26/27" -> 2026).
 * Tahun yang tidak terbaca bernilai -1 agar kelompoknya selalu terakhir.
 */
export function academicYearRank(academicYear: string): number {
  const trimmed = academicYear.trim();
  const full = /(\d{4})/.exec(trimmed);
  if (full) return Number.parseInt(full[1], 10);
  const short = /^(\d{2})\s*\//.exec(trimmed);
  if (short) return 2000 + Number.parseInt(short[1], 10);
  return -1;
}

function compareOptions(a: ClassPickerOption, b: ClassPickerOption): number {
  const gradeA = classGradeRank(a.label);
  const gradeB = classGradeRank(b.label);
  const rankA = gradeA ?? Number.POSITIVE_INFINITY;
  const rankB = gradeB ?? Number.POSITIVE_INFINITY;
  if (rankA !== rankB) return rankA - rankB;
  const byLabel = a.label.localeCompare(b.label, 'id', { sensitivity: 'base' });
  if (byLabel !== 0) return byLabel;
  return a.id - b.id;
}

/**
 * Kelompokkan kelas per tahun ajaran. Kelompok diurutkan tahun terbaru dulu
 * (kunci academicYearRank menurun), seri dipecah menurut label; kelas tanpa
 * tahun ajaran masuk kelompok "Lainnya" yang selalu terakhir. Di dalam
 * kelompok: jenjang menaik (yang tidak terbaca terakhir), lalu nama, lalu id.
 */
export function groupClasses(items: ClassPickerOption[]): ClassPickerGroup[] {
  const byKey = new Map<string, ClassPickerOption[]>();
  for (const item of items) {
    const key = item.academic_year?.trim() ?? '';
    const bucket = byKey.get(key);
    if (bucket) bucket.push(item);
    else byKey.set(key, [item]);
  }
  const groups: ClassPickerGroup[] = [...byKey.entries()].map(([key, bucket]) => ({
    key,
    label: key === '' ? 'Lainnya' : key,
    items: [...bucket].sort(compareOptions),
  }));
  groups.sort((a, b) => {
    const byYear = academicYearRank(b.key) - academicYearRank(a.key);
    if (byYear !== 0) return byYear;
    return a.label.localeCompare(b.label, 'id', { sensitivity: 'base' });
  });
  return groups;
}

/** Saring kelas menurut teks pencarian (nama + tahun ajaran, tidak peka huruf). */
export function filterClasses(items: ClassPickerOption[], query: string): ClassPickerOption[] {
  const needle = query.trim().toLocaleLowerCase('id');
  if (!needle) return [...items];
  return items.filter((item) => `${item.label} ${item.academic_year ?? ''}`.toLocaleLowerCase('id').includes(needle));
}

/** Kelompokkan kelas setelah disaring teks pencarian. */
export function groupFilteredClasses(items: ClassPickerOption[], query: string): ClassPickerGroup[] {
  return groupClasses(filterClasses(items, query));
}

/** Keadaan centang "pilih semua grup": kosong, sebagian, atau semua. */
export function groupSelectionState(items: ClassPickerOption[], selectedIds: number[]): GroupSelectionState {
  if (items.length === 0) return 'none';
  const selected = new Set(selectedIds);
  const count = items.filter((item) => selected.has(item.id)).length;
  if (count === 0) return 'none';
  if (count === items.length) return 'all';
  return 'some';
}

/**
 * Terapkan penambahan/penghapusan banyak id sekaligus ke daftar terpilih.
 * Id yang sudah terpilih dipertahankan urutannya; id baru ditambahkan
 * di akhir mengikuti urutan daftar ids yang diberikan.
 */
export function toggleSelectedIds(selectedIds: number[], ids: number[], select: boolean): number[] {
  if (select) {
    const result = [...selectedIds];
    for (const id of ids) {
      if (!result.includes(id)) result.push(id);
    }
    return result;
  }
  const removed = new Set(ids);
  return selectedIds.filter((id) => !removed.has(id));
}
