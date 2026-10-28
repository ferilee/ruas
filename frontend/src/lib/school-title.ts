// Judul asesmen mengikuti pengaturan SCHOOL_NAME di server: pemasangan
// per sekolah menampilkan nama sekolahnya, pemasangan tanpa nama sekolah
// memakai judul umum. Nilai kosong/null (termasuk selama data belum
// termuat) selalu jatuh ke judul umum.
export function assessmentTitle(schoolName: string | null | undefined): string {
  const name = schoolName?.trim();
  return name ? `Asesmen ${name}` : 'Ruang Asesmen';
}
