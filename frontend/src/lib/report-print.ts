// Bangunan teks untuk dokumen ekspor PDF laporan. Dokumen cetak dirender
// ReportsPanel dari data yang sedang tampil; helper di sini murni agar
// judul dokumen (sekaligus nama file PDF) dan konteks filter konsisten
// antara mode admin dan mode guru.
export type ReportPrintMode = 'questions' | 'students';

export function reportPrintHeading(mode: ReportPrintMode): string {
  return mode === 'questions' ? 'Analisis per Soal' : 'Hasil Siswa';
}

export function reportPrintDocumentTitle(mode: ReportPrintMode, schoolName: string | null | undefined): string {
  const name = schoolName?.trim();
  const heading = reportPrintHeading(mode);
  return name ? `${heading} — ${name}` : heading;
}

export function reportPrintBrand(schoolName: string | null | undefined): string {
  const name = schoolName?.trim();
  return name ? `RUAS — Ruang Asesmen · ${name}` : 'RUAS — Ruang Asesmen';
}

export function reportPrintContext(input: { topicLabel: string; classLabel: string; completedAttempts: number; totalAttempts: number }): string {
  return `Topik: ${input.topicLabel} · Kelas: ${input.classLabel} · ${input.completedAttempts} dari ${input.totalAttempts} hasil selesai`;
}

export function formatReportPrintDate(date: Date): string {
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
