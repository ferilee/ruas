# Database

## MariaDB di Docker Compose

Compose membuat service `mariadb` dan database `utbk_belajar` secara otomatis.
Data disimpan di volume `utbk_mariadb_data`, sehingga tetap ada ketika
container dibuat ulang. Port host default-nya `3308` agar tidak bertabrakan
dengan MariaDB lain yang mungkin sudah memakai `3306`.

```bash
docker compose up -d mariadb
docker compose ps mariadb
docker compose logs mariadb
```

Untuk masuk ke MariaDB dari dalam container:

```bash
docker compose exec mariadb mariadb -u root -p
```

Password root berasal dari `DB_ROOT_PASSWORD` di `.env`.

Jangan menghapus volume `utbk_mariadb_data` kecuali memang ingin menghapus
seluruh data database.

## Validasi Seed Sebelum Deploy

Sebelum container dijalankan, validasi `seed.json`:

```bash
bun run seed:check
```

Jika gagal, perbaiki `seed.json` dulu sebelum lanjut.
