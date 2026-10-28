# Checklist Gerbang Rilis RUAS

Jalankan seluruh daftar ini sebelum setiap pemasangan/deploy. Item otomatis
menangkap regresi kode; item manual menangkap yang tidak bisa dibuktikan
dari kode saja (RUAS-002 & RUAS-016).

## Otomatis (wajib hijau)

- [ ] `bun run test` — semua test backend & frontend lulus
- [ ] `bun run typecheck` — lulus
- [ ] `bun run lint` — lulus
- [ ] Test regresi responsif `responsive-exam-css.test.ts` ikut lulus
      (target sentuh ≥44px di layar ujian, panel soal–jawaban menumpuk
      di lebar sempit, header ujian membungkus, tanpa overflow horizontal)

## Manual — uji simpan gagal (RUAS-002)

Untuk setiap form, buat satu kegagalan dan pastikan pesan error muncul
**di field penyebabnya**, bukan diam:

- [ ] Tambah Topik dengan slug yang sudah dipakai → error di field slug
- [ ] Tambah Soal dengan pertanyaan kosong → error di field pertanyaan
- [ ] Tambah Pengguna dengan username duplikat → error di field username
- [ ] Simpan Jadwal dengan waktu selesai sebelum waktu mulai → pesan jelas
- [ ] Satu kegagalan jaringan (matikan koneksi sesaat) → pesan error tampil

## Manual — uji HP (RUAS-016)

Di HP sungguhan atau emulator lebar 360–400px:

- [ ] Kerjakan satu asesmen demo sampai selesai tanpa scroll horizontal
- [ ] Header ujian: Informasi Ujian, Daftar Soal, lencana perlindungan,
      dan timer tidak bertumpuk/terpotong
- [ ] Semua tombol bisa ditekan dengan nyaman (≥44px)
- [ ] Ruang guru: kartu dan modal dapat dibuka/ditutup dengan normal
