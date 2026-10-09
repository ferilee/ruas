# Update melalui GHCR dan Arcane

Setiap push ke branch `main` menjalankan workflow
`.github/workflows/publish-ruas-image.yml`. Workflow membangun image dari
`Dockerfile`, lalu menerbitkan:

- `ghcr.io/<owner>/ruas:latest` untuk rilis terbaru
- `ghcr.io/<owner>/ruas:sha-<commit>` untuk rollback yang pasti

Project RUAS di Arcane menggunakan variabel `RUAS_IMAGE` di `.env`. Alur
update dari Arcane:

1. Push perubahan ke `main` dan tunggu workflow **Publish RUAS image** selesai.
2. Buka project `ruas` di Arcane.
3. Pilih **Pull** untuk mengambil image terbaru.
4. Pilih **Redeploy** untuk membuat ulang service RUAS.
5. Periksa `https://ruas.smkpasirian-lmj.sch.id/health`.

Jika package GHCR dibuat private, tambahkan kredensial registry GHCR pada
Arcane terlebih dahulu. Database MariaDB tidak ikut di-pull atau di-redeploy;
service `mariadb` tetap dikelola oleh project terpisah.

Untuk rollback, ubah `RUAS_IMAGE` di `.env` project Arcane menjadi tag SHA,
misalnya `ghcr.io/<owner>/ruas:sha-abc1234`, lalu lakukan **Pull** dan
**Redeploy** kembali.
