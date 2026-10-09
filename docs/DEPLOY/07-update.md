# Update

Sinkronkan source release dari workstation ke `/srv/apps/ruas` tanpa menimpa
`.env`, lalu jalankan di VPS:

```bash
cd /srv/apps/ruas
docker compose build --pull
docker compose -f /srv/platform/mariadb/docker-compose.yml up -d
docker compose up -d
docker compose -f /srv/apps/ruas/docker-compose.yml exec ruas bun src/db/migrate.ts
docker compose -f /srv/apps/ruas/docker-compose.yml exec ruas bun src/lib/seed.ts
```

Setelah update:

```bash
curl http://localhost:3000/health
docker compose logs --tail=100
```
