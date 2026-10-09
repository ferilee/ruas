# Checklist

## Checklist Operasional dari Nol

1. arahkan DNS domain ke IP VPS
2. install Docker + Docker Compose
3. clone repo
4. `bun install` + `bun run install:all`
5. build frontend
6. isi file `.env`, termasuk password MariaDB
7. `bun run seed:check`
8. buat `ferileenet`
9. jalankan NPM
10. jalankan MariaDB dari `/srv/platform/mariadb`
11. jalankan app dari `/srv/apps/ruas`
12. migrasi + seed
13. buat Proxy Host di NPM ke `ruas:3000`
14. aktifkan SSL
15. cek `https://domain-anda.com/health`
16. cek `https://domain-anda.com/api/auth`
17. buka domain di browser

## Checklist Produksi Satu Domain

- [ ] `frontend/dist/` ada (hasil build)
- [ ] `bun run seed:check` lulus
- [ ] migrasi database sudah dijalankan
- [ ] seed sudah dijalankan
- [ ] `https://domain-anda.com/health` → `{"status":"ok"}`
- [ ] `https://domain-anda.com/api/auth` bisa diakses
- [ ] frontend di domain utama bisa panggil `/api/*` tanpa domain kedua
