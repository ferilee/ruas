# Ruang Asesmen — Arsitektur & Fitur

> Dokumen ini menggambarkan kondisi aktual aplikasi saat ini.
> Bukan rencana — apa yang sudah jadi.

---

## 1. Ringkasan

Aplikasi web latihan dan ujian sekolah. Alur: pilih mata pelajaran → pilih topik → mulai → soal acak → timer → jawab → lihat pembahasan → lanjut → resume akhir.

- Single-user, auth opsional (password)
- Riwayat ujian tersimpan — sesi, jawaban, hasil, dan aktivitas integritas dicatat
- Fokus pada latihan per soal dengan pembahasan langsung

---

## 2. Stack Teknis

| Layer | Teknologi | Versi |
|---|---|---|
| Runtime | Bun | 1.3.x |
| Backend | Hono | ^4.8 |
| Database | MariaDB / MySQL 8 | |
| ORM | Drizzle ORM | |
| Validasi | Zod | |
| Frontend | Vue 3 (Composition API) | |
| Router | Vue Router | |
| Testing | Vitest | 51 test |
| Build | Vite | |
| Linter | ESLint | |
| Formatter | Prettier | |

---

## 3. Arsitektur

```text
┌───────────────┐     HTTP/JSON      ┌───────────┐     MySQL      ┌───────────┐
│  Vue 3 (SPA)  │ ◄───────────────►  │  Hono     │ ◄───────────►  │  MariaDB  │
│  :5173 (dev)  │     /api/*         │  :3000    │     Drizzle    │  :3306    │
└───────────────┘                    └───────────┘               └───────────┘
```

Production: backend serve frontend `dist/` langsung. Satu service, satu domain, tanpa nginx untuk frontend.

```
NPM → app:3000
         ├── /          → frontend SPA (index.html)
         ├── /assets/*  → file build Vite
         └── /api/*     → backend Hono
```

---

## 4. Model Data

```
participant_profiles  ──<  exam_attempts  ──<  exam_answers
                                      └──<  exam_integrity_events
subjects  ──<  topics  ──<  questions  ──<  question_options
```

12 tabel digunakan. Data akun pengguna, profil peserta, percobaan ujian, jawaban, dan aktivitas
integritas disimpan permanen di MariaDB. `identity_key` menghubungkan profil
dengan username login atau client ID ketika autentikasi aplikasi dinonaktifkan.

`exam_attempts` menyimpan status `in_progress`, `completed`, atau `abandoned`.
Setiap jawaban masuk ke `exam_answers`, sedangkan aktivitas integritas masuk ke
`exam_integrity_events`.

### users

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int auto_increment | PK |
| username | varchar(100) unique | Identitas login |
| password_hash | varchar(255) | Password hasil hashing scrypt |
| display_name | varchar(150) | Nama yang ditampilkan admin |
| class_id | int nullable FK | Kelas rombel peserta |
| subject_id | int nullable FK | Mata pelajaran yang ditetapkan admin |
| role | enum | `admin`, `editor`, `participant` |
| active | int | Status akun |

Password pengguna tidak disimpan dalam bentuk plaintext. Admin menetapkan mata
pelajaran pada akun peserta. Profil peserta hanya melengkapi jenis kelamin,
tanggal lahir, dan token sesi setelah login pertama.

### education_classes

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int auto_increment | PK |
| slug | varchar(50) unique | Kode kelas, misalnya `11-tkj-a` |
| label | varchar(100) | Nama kelas, misalnya `Kelas 11 TKJ A` |
| academic_year | varchar(20) | Tahun ajaran, misalnya `2026/2027` |
| grade | int | Tingkat kelas, misalnya `10` atau `11` |
| program | varchar(50) | Program keahlian, misalnya `TKJ` atau `RPL` |
| section | varchar(20) nullable | Rombel, misalnya `A` atau `B` |
| display_order | int | Urutan tampil |

### subjects

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int auto_increment | PK |
| slug | varchar(50) unique | Kode mata pelajaran, misalnya `penalaran-umum` |
| label | varchar(100) | Nama mata pelajaran |
| display_order | int | Urutan tampil |
| max_attempts | int | Batas percobaan per siswa dan topik; `0` berarti tanpa batas |

### topics

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int auto_increment | PK |
| subject_id | int FK | → subjects.id |
| slug | varchar(50) unique | `penalaran-umum` |
| label | varchar(100) | `Penalaran Umum` |
| display_order | int | |

### questions

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int auto_increment | PK |
| topic_id | int FK | → topics.id |
| type | enum | `single_choice`, `multiple_response`, `true_false` |
| difficulty | enum | `easy`, `medium`, `hard` |
| question_text | text | Isi soal |
| explanation_text | text | Pembahasan |
| external_id | varchar(100) nullable | ID stabil untuk dedup |
| created_at | timestamp | |

### question_options

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int auto_increment | PK |
| question_id | int FK | → questions.id |
| option_key | varchar(5) | `A`, `B`, `C`, `D`, `true`, `false` |
| option_text | text | Teks opsi |
| is_correct | boolean | Kunci jawaban |
| display_order | int | |

---

## 5. API Endpoints

### `GET /health`

Cek server. Tidak perlu auth.

```json
{ "status": "ok" }
```

### `GET /api/auth`

Cek status auth.

```json
{ "auth_enabled": true }
```

### `POST /api/auth`

Login memeriksa akun pada tabel `users`. `APP_USERNAME`/`APP_PASSWORD` tetap
tersedia sebagai fallback untuk instalasi lama.

Request:
```json
{ "username": "...", "password": "..." }
```

Response:
```json
{ "token": "uuid-string" }
```

### `GET /api/subjects`

Daftar subject. Butuh header `x-auth-token` (jika auth aktif).

### `GET /api/topics?subject_id=<id>`

Daftar topic + `question_count`.

```json
{
  "topics": [
    { "id": 1, "subject_id": 1, "slug": "...", "label": "...", "display_order": 1, "question_count": 4 }
  ]
}
```

### `GET /api/topics/:id`

Detail satu topic + `question_count`. Untuk lookup subject dari topic.

```json
{
  "topic": { "id": 1, "subject_id": 1, "slug": "...", "label": "...", "display_order": 1, "question_count": 4 }
}
```

### `GET /api/questions/random?topic_id=<id>&exclude=<ids>`

1 soal acak. Option tidak menyertakan `is_correct`.

### `GET /api/questions/count?topic_id=<id>`

Jumlah soal dalam topic.

### `POST /api/questions/:id/check`

Koreksi jawaban.

Request:
```json
{ "selected_keys": ["B"] }
```

Response (benar/salah):
```json
{
  "correct": true | false,
  "correct_keys": ["B"],
  "explanation": "Pembahasan..."
}
```

### Persistensi peserta dan ujian

| Method | Path | Fungsi |
|---|---|---|
| GET | `/api/profile` | Memuat profil peserta dari database |
| PUT | `/api/profile` | Menyimpan atau memperbarui profil peserta |
| POST | `/api/exam/attempts` | Membuat sesi ujian |
| GET | `/api/exam/attempts/active?topic_id=<id>` | Memulihkan sesi yang belum selesai |
| GET | `/api/exam/attempts/availability?subject_id=<id>&topic_id=<id>` | Memeriksa sisa percobaan |
| POST | `/api/exam/attempts/:id/answers` | Menyimpan dan mengoreksi jawaban |
| POST | `/api/exam/attempts/:id/events` | Menyimpan aktivitas integritas |
| POST | `/api/exam/attempts/:id/complete` | Menutup dan menyimpan hasil ujian |
| POST | `/api/exam/attempts/:id/abandon` | Menandai sesi yang ditinggalkan |

### Admin editor

Admin memakai password terpisah dari `APP_PASSWORD` melalui `ADMIN_PASSWORD`.
Token admin dikirim dengan header `x-admin-token`.

| Method | Path | Fungsi |
|---|---|---|
| GET | `/api/admin/auth` | Cek status editor admin |
| POST | `/api/admin/auth` | Login editor |
| GET | `/api/admin/topics` | Daftar topik untuk form editor |
| GET | `/api/admin/questions` | Daftar soal |
| GET | `/api/admin/questions/:id` | Detail soal termasuk kunci jawaban |
| POST | `/api/admin/questions` | Tambah soal |
| PUT | `/api/admin/questions/:id` | Edit soal dan opsi |
| DELETE | `/api/admin/questions/:id` | Hapus soal |
| POST | `/api/admin/questions/import` | Preview atau terapkan import JSON |
| GET | `/api/admin/users` | Daftar akun pengguna |
| POST | `/api/admin/users` | Tambah akun manual |
| PUT/DELETE | `/api/admin/users/:id` | Edit atau hapus akun |
| POST | `/api/admin/users/import` | Preview atau terapkan import CSV/JSON |
| PATCH | `/api/admin/users/bulk-class` | Menetapkan atau mengosongkan kelas untuk banyak akun |
| PATCH | `/api/admin/users/bulk-subject` | Menetapkan atau mengosongkan mata pelajaran untuk banyak akun |
| GET | `/api/admin/reports` | Ringkasan dan daftar hasil asesmen dengan filter |
| GET | `/api/admin/reports/:id` | Detail hasil, jawaban, dan aktivitas anti-cheat |
| GET | `/api/admin/curriculum` | Daftar kelas, jenis asesmen, dan mata pelajaran |
| POST/PUT/DELETE | `/api/admin/curriculum/classes/:id` | Kelola kelas |
| POST/PUT/DELETE | `/api/admin/curriculum/assessment-types/:id` | Kelola jenis asesmen |
| POST/PUT/DELETE | `/api/admin/curriculum/subjects/:id` | Kelola mata pelajaran; DELETE menghapus topik/soal terkait |

Endpoint kurikulum peserta `GET /api/curriculum` memakai sesi peserta dan
menyediakan data yang sama untuk halaman awal. Mata pelajaran dapat berlaku
untuk semua kelas/jenis asesmen atau dibatasi dengan `class_id` dan
`assessment_type_id`. `max_attempts` diatur dari menu kurikulum admin, berlaku
per siswa dan per topik pada mata pelajaran tersebut, dan tetap ditegakkan di
endpoint pembuatan sesi.

---

## 6. Autentikasi

| `APP_PASSWORD` | Efek |
|---|---|
| Kosong dan belum ada akun DB | Auth nonaktif. Frontend tidak redirect ke /auth. |
| Diisi atau sudah ada akun DB | Halaman /auth muncul. Semua request API butuh header `x-auth-token`. |

Token bersifat in-memory di server. Hilang saat restart.

---

## 7. Alur Pengguna

```text
[Home] → Pilih Subject → [Topics] → Pilih Topic → [Quiz]
                                                       │
                                           [Siap berlatih?]
                                           [    Mulai    ]
                                               │
                                    Timer start + Soal
                                    User pilih jawaban
                                    Klik "Selesai"
                                               │
                                    Timer stop
                                    API /check
                                    Tampilkan: benarsalah + waktu + pembahasan
                                               │
                           ┌───────────────────┴──────────┐
                           │ Soal terakhir?                │ bukan?
                           │ YA: [Lihat Hasil]             │ [Soal Berikutnya]
                           │     → Resume (skor, waktu)    │     → soal baru
                           └────────────────────────────────┘
```

**Konfirmasi keluar:** jika klik "Ganti Topik" atau navigasi browser saat sesi berjalan, muncul modal "Yakin berhenti?".

---

## 8. Struktur Backend

```
backend/src/
├── config.ts                  # Load env (process.env + .env file)
├── app.ts                     # Hono factory: routes, CORS, error, health, static
├── index.ts                   # Entry point: pool → migrasi → serve
│
├── db/
│   ├── connection.ts          # MySQL pool
│   ├── migrate.ts             # Migration runner
│   └── schema/                # Drizzle schema (12 tabel)
│
├── routes/
│   ├── auth.ts                # GET (status), POST (login)
│   ├── subjects.ts            # GET list
│   ├── topics.ts              # GET list + count
│   ├── questions.ts           # GET random, GET count, POST check
│   ├── participant-profile.ts # GET/PUT profil peserta
│   ├── exam-attempts.ts       # Sesi, jawaban, hasil, dan aktivitas ujian
│   └── admin-users.ts         # CRUD dan import pengguna
│
├── services/
│   ├── question-service.ts     # Query logic (random, count, check)
│   └── user-service.ts         # Akun, hashing, dan autentikasi DB
│
├── validators/
│   └── question-validator.ts   # Zod + manual validation
│
├── mappers/
│   └── question-response.ts    # Response shaping
│
├── middleware/
│   └── require-auth.ts         # Token validation
│
├── lib/
│   ├── auth-store.ts           # In-memory token storage
│   ├── password.ts             # Hash dan verifikasi password scrypt
│   ├── scoring.ts              # Answer evaluation
│   ├── seed.ts                 # Seed runner
│   └── seed-check.ts           # Seed validator
│
└── __tests__/                  # 7 test files, 27 tests
```

---

## 9. Struktur Frontend

```
frontend/src/
├── main.ts                               # Bootstrap: createApp + router
├── App.vue                               # Root + global layout
│
├── router/
│   └── index.ts                          # Routes + auth guard + async init
│
├── views/
│   ├── AuthView.vue                      # Login form
│   ├── AdminView.vue                     # Editor soal dan import JSON
│   ├── HomeView.vue                      # Daftar subject
│   ├── TopicView.vue                     # Daftar topic + count
│   └── QuizView.vue                      # Quiz container (tipis)
│
├── components/
│   ├── UsersPanel.vue                   # CRUD dan import pengguna admin
│   ├── QuestionCard.vue                  # Soal + type/difficulty badge
│   ├── TimerBar.vue                      # Stopwatch display
│   ├── OptionList.vue                    # Opsi (radio/checkbox)
│   └── ExplanationPanel.vue              # Benarsalah + pembahasan
│
├── composables/
│   └── useQuizSession.ts                 # State machine quiz (load → answer → review → resume)
│
├── api/
│   └── client.ts                         # HTTP client + token header
│
├── types/
│   └── index.ts                          # TypeScript interfaces
│
└── __tests__/                             # 5 test files, 24 tests
```

---

## 10. Environment

File `.env` di root project:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rahaSi4Hasan
DB_NAME=ruas_belajar
APP_PORT=3000
FRONTEND_PORT=5173
APP_PASSWORD=
ADMIN_PASSWORD=
EXAM_EXIT_PASSWORD=
CORS_ORIGIN=
```

| Variabel | Fungsi |
|---|---|
| `DB_*` | Koneksi database |
| `APP_PORT` | Port backend |
| `FRONTEND_PORT` | Port Vite dev + fallback CORS |
| `APP_PASSWORD` | Kosong = auth nonaktif. Diisi = login required |
| `ADMIN_PASSWORD` | Kosong = editor nonaktif. Diisi = akses `/admin` |
| `EXAM_EXIT_PASSWORD` | Kata sandi pengawas untuk mengakhiri ujian. Kosong = gunakan `ADMIN_PASSWORD` |
| `CORS_ORIGIN` | Kosong = `http://localhost:FRONTEND_PORT`. Isi untuk production. |

---

## 11. Testing

| Area | File Test | Jumlah |
|---|---|---|
| Backend | 7 files | 27 tests |
| Frontend | 5 files | 24 tests |
| **Total** | **12 files** | **51 tests** |

---

## 12. Tooling

```bash
bun run lint           # ESLint
bun run format         # Prettier
bun run format:check   # Prettier check only
bun run test           # Backend + Frontend
bun run typecheck      # TypeScript strict
bun run seed:check     # Validasi seed.json
```

---

## 13. Deployment

- Image: `oven/bun:1.3.14` (tanpa build image)
- Frontend build di-mount dari host
- Backend source di-mount dari host
- Reverse proxy: Nginx Proxy Manager / Caddy
- Satu domain, satu service
- Panduan lengkap: `docs/DEPLOY/`

---

## 14. Prinsip Desain

1. **Kesederhanaan** — fitur minimum yang berguna
2. **Auth opsional** — password via env, nonaktif jika dikosongkan
3. **Persistensi ujian** — profil, jawaban, hasil, dan aktivitas integritas tersimpan di database
4. **Seed dan editor admin** — data dapat masuk via JSON atau halaman `/admin`; subjects dan topics tetap seed-managed
5. **Timer per soal** — stopwatch dari tampil sampai submit
6. **All-or-nothing** — multiple_response harus tepat semua
