# Update

```bash
git pull
git clean -fdX
bun install --frozen-lockfile
bun run install:all:frozen
bun run build:frontend
bun run seed:check
docker compose restart
docker compose exec ruas bun src/db/migrate.ts
docker compose exec ruas bun src/lib/seed.ts
```

Setelah update:

```bash
curl http://localhost:3000/health
docker compose logs --tail=100
```
