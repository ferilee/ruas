# Setup

## 1. Clone Project

```bash
git clone <url-repo> utbk2
cd utbk2
```

## 2. Install Dependency

```bash
bun install --frozen-lockfile
bun run install:all:frozen
```

## 3. Build Frontend

```bash
bun run build:frontend
```

Hasil build masuk ke `frontend/dist/`.

## 4. Setup Environment

```bash
cp .env.production.example .env
nano .env
```

Contoh isi:

```env
DB_HOST=mariadb
DB_PORT=3306
DB_HOST_PORT=3308
DB_USER=utbk
DB_PASSWORD=ganti-password-mysql
DB_ROOT_PASSWORD=ganti-root-password-mysql
DB_NAME=utbk_belajar
APP_PORT=3000
FRONTEND_PORT=5173
APP_PASSWORD=ganti-password-app
CORS_ORIGIN=https://domain-anda.com
```

Catatan:
- `APP_PASSWORD` — kosongkan jika auth nonaktif
- `CORS_ORIGIN` — isi domain publik final
- `DB_HOST=mariadb` — nama service MariaDB di Docker Compose
- `DB_HOST_PORT` — port MariaDB di host untuk koneksi development langsung; port internal tetap `3306`
- `DB_PASSWORD` — password user aplikasi database
- `DB_ROOT_PASSWORD` — password root MariaDB untuk administrasi
