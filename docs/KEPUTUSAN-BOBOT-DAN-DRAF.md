# Keputusan: Bobot Soal & Status Draf (RUAS-012)

Tanggal keputusan: 28 Oktober 2026
Konteks: audit UI/UX RUAS (checklist perbaikan RUAS-012)

## Keputusan

RUAS **tidak** menambahkan kolom bobot/poin per soal dan **tidak** menambahkan
status draf/terbit pada soal pada saat ini. Sebagai gantinya, ketentuan ini
didokumentasikan secara eksplisit di dalam aplikasi (catatan pada form soal):

1. **Semua soal berbobot sama.** Nilai akhir dihitung dari proporsi jawaban
   benar terhadap total soal pada attempt (dengan kebijakan nilai laporan:
   terbaik / terakhir / rata-rata). Guru yang membutuhkan diferensiasi tingkat
   kesulitan memakai label kesulitan (Mudah/Sedang/Sulit) sebagai penanda,
   bukan sebagai pengali nilai.
2. **Tidak ada status draf pada soal.** Soal yang tersimpan langsung menjadi
   bagian dari topiknya. Keterlihatan ke siswa diatur oleh dua mekanisme yang
   sudah ada:
   - **Jadwal Asesmen** per topik (aktif/nonaktif, jendela waktu), dan
   - **Token topik** yang wajib dimasukkan siswa sebelum membuka topik.
   Soal yang belum siap dipakai dapat **diarsipkan** dari form edit soal.

## Alasan

- Menambah bobot per soal berarti migrasi skema (`questions`), perubahan
  logika scoring di `backend/src/lib/scoring.ts` dan `report-service`, serta
  perubahan kontrak nilai yang sudah berjalan untuk laporan yang ada.
- Pola penggunaan saat ini (latihan & asesmen kelas oleh guru sendiri) belum
  menunjukkan kebutuhan bobot diferensial; risiko perubahan kontrak nilai
  lebih besar daripada manfaatnya sekarang.

## Konsekuensi & pemicu evaluasi ulang

- Bila guru mulai meminta soal bernilai berbeda (mis. soal HOTS bernilai lebih),
  evaluasi ulang keputusan ini: tambahkan kolom `weight` (default 1) lewat
  migrasi Drizzle, sesuaikan scoring agar berbobot, dan tampilkan kolom bobot
  di form soal.
- Status draf dievaluasi ulang bila ada alur kurasi multi-guru di mana soal
  perlu ditinjau sebelum tampil.
