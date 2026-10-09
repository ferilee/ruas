# Database

## MariaDB terpusat di Docker Compose

Compose MariaDB berada di `/srv/platform/mariadb` dan dapat digunakan oleh
beberapa aplikasi melalui network `ferileenet`. Data disimpan di
`/srv/data/mariadb`, sehingga tetap ada ketika container dibuat ulang.

```bash
cd /srv/platform/mariadb
docker compose up -d mariadb
docker compose ps mariadb
docker compose logs mariadb
```

Backup operasional RUAS disimpan di `/srv/backups/ruas`.

Untuk masuk ke MariaDB dari dalam container:

```bash
docker compose exec mariadb mariadb -u root -p
```

Password root berasal dari `DB_ROOT_PASSWORD` di `.env`.

Jangan menghapus `/srv/data/mariadb` kecuali memang ingin menghapus seluruh
data database yang digunakan aplikasi.

## Validasi Seed Sebelum Deploy

Sebelum container dijalankan, validasi `seed.json`:

```bash
bun run seed:check
```

Jika gagal, perbaiki `seed.json` dulu sebelum lanjut.
