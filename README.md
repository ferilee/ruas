# Ruang Asesmen

Aplikasi web untuk latihan dan ujian sekolah.
Dibuat untuk kebutuhan belajar mandiri dan asesmen sekolah,
dengan bantuan AI untuk menyusun soal, serta tampilan ujian
yang fokus dan responsif.

Tujuan: kamu dan soal. Selesai satu, lanjut berikutnya.

| | |
|---|---|---|
| ![home](docs/screenshots/02-home.png) | ![quiz-ready](docs/screenshots/03-ready.png) |
| ![quiz](docs/screenshots/04-answering.png) | ![review](docs/screenshots/05-reviewing.png) |

Flow: pilih mata pelajaran → pilih topik → kerjakan soal → timer → jawab → lihat pembahasan → lanjut → resume.

- **Stack:** Bun + Hono + Drizzle + MariaDB + Vue 3
- **Auth opsional:** via `APP_PASSWORD` di `.env`
- **Testing:** 51 test (Vitest)

---

## Tentang

Menyusun bank soal dan paket ujian sekolah membutuhkan waktu.
Ruang Asesmen menyediakan wadah untuk mengelola soal dan
mengerjakan asesmen dengan tampilan yang terarah.

**Ruang Asesmen** menyediakan:

- Soal diimpor dari file JSON — mudah digenerate oleh AI
  (lihat panduan di `docs/FORMAT-SOAL/`)
- Layout ujian dua panel — soal dan jawaban terlihat berdampingan
- Timer sesi — pantau waktu pengerjaan
- Pembahasan langsung — belajar dari kesalahan saat itu juga
- Resume di akhir — lihat skor dan waktu total sebagai evaluasi

Tidak ada login berlapis, tidak ada leaderboard, tidak ada
notifikasi. Buka, kerjakan, tutup.

---

## Cara Menjalankan

### Prasyarat

- [Bun](https://bun.sh) v1.3+
- MariaDB / MySQL 8, database `ruas_belajar` sudah dibuat

### Setup

```bash
git clone <repo> ruas2 && cd ruas2
bun install && bun run install:all
bun run db:migrate && bun run seed
bun run dev
```

Frontend di `http://localhost:5173`, backend di `http://localhost:3000`.

### Konfigurasi `.env`

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_HOST_PORT=3308
DB_USER=ruas
DB_PASSWORD=password-anda
DB_NAME=ruas_belajar
APP_PORT=3000
FRONTEND_PORT=5173
APP_USERNAME=P130100230  # kosong = username apa pun, isi = username wajib
APP_PASSWORD=        # kosong = tanpa login, isi = login required
# kosong = editor nonaktif
ADMIN_PASSWORD=
# kosong = gunakan ADMIN_PASSWORD saat keluar dari ujian
EXAM_EXIT_PASSWORD=
CORS_ORIGIN=         # kosong = auto localhost, isi domain untuk production
```

### Editor Admin

Jika `ADMIN_PASSWORD` diisi, buka `/admin` untuk mengelola soal. Editor
mendukung tambah, edit, hapus, dan import JSON. Password editor terpisah dari
`APP_PASSWORD`.
Atur `EXAM_EXIT_PASSWORD` untuk kata sandi pengawas saat peserta keluar dari
ujian; jika kosong, aplikasi menggunakan `ADMIN_PASSWORD`.

---

## Perintah Penting

| Perintah | Fungsi |
|---|---|
| `bun run dev` | Jalankan backend + frontend |
| `bun run test` | Semua test |
| `bun run typecheck` | TypeScript check |
| `bun run build:frontend` | Build frontend untuk production |
| `bun run seed` | Insert soal dari `seed.json` |
| `bun run seed:check` | Validasi `seed.json` tanpa DB |
| `bun run db:migrate` | Migrasi database |
| `bun run lint` / `format` | ESLint / Prettier |

---

## Dokumentasi

| Topik | Lokasi |
|---|---|
| Arsitektur & API | `docs/ARSITEKTUR.md` |
| Panduan deploy production | `docs/DEPLOY/` |
| Format & cara menambah soal | `docs/FORMAT-SOAL/` |
| Struktur direktori | `docs/STRUKTUR.md` |
| Catatan rilis | `docs/CHANGELOG.md` |
| Aturan project untuk developer | `RULES.md` |

---

## FAQ

**Q: Apakah aplikasi selalu pakai login?**  
A: Tidak. Hanya jika `APP_PASSWORD` diisi di `.env`.

**Q: Kenapa tidak ada riwayat nilai?**  
A: Scope aplikasi latihan per soal tanpa history tersimpan.

**Q: Bisakah menambah soal lewat UI?**  
A: Bisa melalui `/admin` jika `ADMIN_PASSWORD` diaktifkan. Import massal tetap bisa dilakukan melalui `seed.json` → `bun run seed`.

**Q: Timer countdown atau stopwatch?**  
A: Stopwatch per soal, bukan countdown.

---

Private — untuk penggunaan pribadi dan sekolah.
