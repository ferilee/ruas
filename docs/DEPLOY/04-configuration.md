# Konfigurasi

## Jalankan MariaDB dan App

```bash
cd /srv/platform/mariadb
docker compose up -d

cd /srv/apps/ruas
docker compose up -d
```

## Konfigurasi Nginx Proxy Manager

### Proxy ke host loopback

- Domain Names: `domain-anda.com`
- Scheme: `http`
- Forward Hostname / IP: `127.0.0.1`
- Forward Port: `3000`

### Proxy ke container app

- Domain Names: `domain-anda.com`
- Scheme: `http`
- Forward Hostname / IP: `ruas`
- Forward Port: `3000`

Catatan:
- NPM meneruskan **semua request domain** ke app
- Tidak perlu proxy path `/api` secara terpisah
- Cukup satu Proxy Host untuk seluruh domain

## Konfigurasi RustFS untuk gambar soal

RUAS menggunakan RustFS melalui API S3. Letakkan service `ruas` dan `rustfs`
pada network Docker yang sama, misalnya `ferileenet`, sehingga backend dapat
mengakses endpoint internal `http://rustfs:9000`.

Tambahkan variabel berikut pada environment service RUAS:

```env
RUSTFS_ENDPOINT=http://rustfs:9000
RUSTFS_PUBLIC_ENDPOINT=https://storage.domain-anda.com
RUSTFS_ACCESS_KEY=...
RUSTFS_SECRET_KEY=...
RUSTFS_BUCKET=ruas-media
RUSTFS_REGION=us-east-1
```

`RUSTFS_ENDPOINT` digunakan backend untuk upload dan hapus object. Backend
membuat presigned URL menggunakan `RUSTFS_PUBLIC_ENDPOINT`, sehingga URL yang
diterima browser harus dapat diakses dari jaringan peserta. Jangan masukkan
access key atau secret key ke frontend.

Buat bucket `ruas-media` melalui RustFS Console atau API S3. Bucket dapat tetap
private karena RUAS memberikan presigned URL sementara untuk setiap gambar.
Gambar soal yang diunggah dalam format JPG, PNG, WEBP, atau GIF dikonversi oleh
backend menjadi WebP dengan kualitas 80 sebelum disimpan ke bucket.
API S3 RustFS menggunakan port `9000`, sedangkan Console menggunakan port
`9001`.

Jika bind mount RustFS menggunakan `/srv/data/rustfs/data:/data`, pastikan
folder dapat ditulis oleh user container RustFS:

```bash
chown -R 10001:10001 /srv/data/rustfs/data
```

## SSL

Di tab SSL pada NPM:
- Request a new SSL Certificate
- Force SSL
- HTTP/2 Support
- HSTS opsional

## Jalankan Migrasi dan Seed

```bash
docker compose -f /srv/apps/ruas/docker-compose.yml exec ruas bun src/db/migrate.ts
docker compose -f /srv/apps/ruas/docker-compose.yml exec ruas bun src/lib/seed.ts
```

Jika `seed.json` diubah di server:

```bash
bun run seed:check
docker compose exec ruas bun src/lib/seed.ts
```
