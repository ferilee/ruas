# Update

Sinkronkan source release dari workstation ke `/srv/apps/ruas` tanpa menimpa
`.env`, lalu jalankan di VPS:

```bash
cd /srv/apps/ruas
docker compose build --pull
docker compose up -d
docker compose exec ruas bun src/db/migrate.ts
docker compose exec ruas bun src/lib/seed.ts
```

Setelah update:

```bash
curl http://localhost:3000/health
docker compose logs --tail=100
```
