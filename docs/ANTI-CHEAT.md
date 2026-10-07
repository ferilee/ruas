# Dokumentasi Anti-Cheat

Ruang Asesmen memiliki perlindungan ujian berbasis kemampuan browser. Perlindungan aktif pada halaman `/quiz/:id` setelah peserta menekan **Mulai Ujian**.

## Fitur yang tersedia

| Perlindungan | Perilaku aplikasi |
|---|---|
| Fullscreen | Peserta harus mengaktifkan mode layar penuh sebelum ujian dimulai. |
| Copy-paste | Copy, paste, cut, klik kanan, drag, dan pemilihan teks diblokir selama sesi aktif. |
| Shortcut | Shortcut salin, tempel, cetak, simpan, refresh, view source, DevTools, dan F12 dicegah. |
| Perpindahan tab | Tab yang disembunyikan atau jendela yang kehilangan fokus dicatat dan menjeda ujian. |
| Keluar fullscreen | Keluar dari fullscreen dicatat dan menjeda ujian. Peserta harus kembali ke fullscreen untuk melanjutkan. |
| Pengamanan keluar | Keluar dari sesi aktif membutuhkan kata sandi pengawas yang divalidasi backend. |
| Peringatan sesi | Pelanggaran ditampilkan sebagai peringatan dan jumlahnya terlihat pada dialog perlindungan ujian. |

## Konfigurasi kata sandi pengawas

Tambahkan konfigurasi berikut di `.env`:

```env
EXAM_EXIT_PASSWORD=password-pengawas
```

Jika `EXAM_EXIT_PASSWORD` kosong, aplikasi menggunakan nilai `ADMIN_PASSWORD`. Setelah mengubah `.env`, restart backend agar konfigurasi dimuat ulang.

Endpoint validasi kata sandi adalah:

```text
POST /api/exam/exit
Header: x-auth-token: <token-peserta>
Body: { "password": "password-pengawas" }
```

Respons yang mungkin:

- `200` — kata sandi benar dan peserta boleh keluar.
- `403` — kata sandi salah; sesi peserta tetap aktif.
- `400` — kata sandi pengawas belum dikonfigurasi.

## Alur pelanggaran

1. Peserta memulai ujian melalui tombol **Mulai Ujian**.
2. Aplikasi meminta fullscreen dan mengaktifkan `useExamGuard`.
3. Guard memasang listener untuk visibility, focus, fullscreen, clipboard, context menu, drag, selection, keyboard shortcut, dan `beforeunload`.
4. Pelanggaran dicatat di memori sesi browser.
5. Timer dijeda dan dialog perlindungan ditampilkan.
6. Peserta hanya dapat melanjutkan setelah mengaktifkan kembali fullscreen.

Pencatatan pelanggaran saat ini bersifat per sesi di sisi klien. Aplikasi tidak menyimpan riwayat peserta atau log pelanggaran permanen di database.

## Batasan keamanan browser

Aplikasi web biasa tidak memiliki izin untuk mengendalikan sistem operasi. Karena itu, fitur berikut tidak dapat diblokir secara absolut oleh JavaScript:

- screenshot bawaan sistem operasi atau perangkat seluler;
- Alt-Tab, pergantian aplikasi, dan pembukaan browser lain;
- kalkulator floating, chat head, split screen, atau aplikasi overlay;
- perekaman layar eksternal atau kamera lain.

Fullscreen dan deteksi fokus hanya memberi sinyal serta pencegahan pada halaman ujian. Untuk penguncian penuh, gunakan kiosk browser, perangkat yang dikelola MDM, Safe Exam Browser, Electron, atau aplikasi native dengan kebijakan perangkat.

## Lokasi implementasi

- Guard browser: `frontend/src/composables/useExamGuard.ts`
- Halaman ujian dan dialog keamanan: `frontend/src/views/QuizView.vue`
- Validasi kata sandi pengawas: `backend/src/routes/exam-exit.ts`
- Konfigurasi environment: `backend/src/config.ts`
- Test guard: `frontend/src/__tests__/composables/useExamGuard.test.ts`
- Test endpoint keluar: `backend/src/__tests__/routes/exam-exit.test.ts`

## Verifikasi

Jalankan pemeriksaan berikut dari root project:

```bash
bun run typecheck
bun run build:frontend
bun run --cwd frontend test -- src/__tests__/composables/useExamGuard.test.ts
bun run --cwd backend test -- src/__tests__/routes/exam-exit.test.ts
```
