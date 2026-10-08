# Troubleshooting

## Frontend jalan, tapi `/api` gagal dari domain publik

Periksa:
1. NPM meneruskan **seluruh domain** ke app, bukan hanya `/`
2. `CORS_ORIGIN` sesuai domain publik
3. App benar-benar menerima request `/api/*`
4. Jika NPM dalam Docker, target upstream bukan `127.0.0.1` melainkan hostname service yang benar

## MariaDB container tidak siap

Error:

```
connect ECONNREFUSED mariadb:3306
```

Kemungkinan:
1. MariaDB masih melakukan inisialisasi pertama
2. Password wajib di `.env` belum diisi
3. Container MariaDB berhenti karena konfigurasi atau volume bermasalah

Cek:

```bash
docker compose ps
docker compose logs mariadb
docker compose exec mariadb mariadb-admin ping -u root -p
```

Jika MariaDB berhenti, periksa log lalu jalankan ulang:

```bash
docker compose restart mariadb
```

## Password database diubah setelah container pertama kali dibuat

Nilai `MARIADB_*` hanya digunakan saat volume database pertama kali dibuat.
Mengubah password di `.env` tidak mengubah user yang sudah ada di volume.
Ubah password dari dalam MariaDB atau gunakan volume baru jika datanya boleh
dihapus.

Untuk mengubah password user aplikasi:

```bash
docker compose exec mariadb mariadb -u root -p -e \
  "ALTER USER 'ruas'@'%' IDENTIFIED BY 'PASSWORD_BARU'; FLUSH PRIVILEGES;"
```

## Network `ferileenet` tidak ditemukan saat `docker compose up`

```bash
docker network create ferileenet
docker compose up -d
```

Cek apakah container sudah join:

```bash
docker inspect ruas | grep ferileenet
```

Jika bridge Docker bermasalah, pakai host networking:

```yaml
services:
  app:
    image: oven/bun:1.3.14
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./frontend/dist:/app/frontend/dist
      - ./backend:/app/backend
      - ./seed.json:/app/seed.json
    working_dir: /app/backend
    command: ["bun", "src/index.ts"]
    environment:
      DB_HOST: 127.0.0.1
      DB_PORT: "3306"
      DB_USER: root
      DB_PASSWORD: ${DB_PASSWORD:-}
      DB_NAME: ruas_belajar
      APP_PORT: "3000"
      APP_USERNAME: ${APP_USERNAME:-}
      FRONTEND_PORT: "5173"
      APP_PASSWORD: ${APP_PASSWORD:-}
      NODE_ENV: production
```

Dengan `network_mode: host`:
- App bisa akses `127.0.0.1:3306` langsung
- App jalan di `localhost:3000` tanpa port mapping
- Pasang reverse proxy (Caddy/Nginx) di host jika ingin dibuka publik

## File `.js`, `.vue.js`, `tsconfig.tsbuildinfo` muncul setelah pull

File generated, bukan untuk di-commit. Hapus:

```bash
git clean -fdX
```

## `bun.lock` berubah setelah install

Ada 3 file `bun.lock` (root, backend, frontend). Gunakan frozen:

```bash
bun install --frozen-lockfile          # root
bun run install:all:frozen             # backend + frontend
```

Jika gagal, ada dependency baru. Jalankan `bun install` biasa di dev, commit semua `bun.lock`, deploy ulang.

## Network `ferileenet` tidak ditemukan

Jika `docker compose up` error soal network:

```bash
docker network create ferileenet
docker compose up -d
```

Cek apakah container sudah join:

```bash
docker inspect ruas 2>/dev/null | grep ferileenet
```
