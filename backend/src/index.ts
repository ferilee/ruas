import { createApp } from './app';
import { createPool } from './db/connection';
import { applyMigrations } from './db/migrate';
import { loadConfig } from './config';

const pool = createPool();

await applyMigrations(pool);

const config = loadConfig();

const app = createApp({
  pool,
  corsOrigin: config.CORS_ORIGIN,
  appUsername: config.APP_USERNAME,
  appPassword: config.APP_PASSWORD,
  adminPassword: config.ADMIN_PASSWORD,
  examExitPassword: config.EXAM_EXIT_PASSWORD,
});

const port = config.APP_PORT;

console.log(`[server] Starting on http://localhost:${port}`);

Bun.serve({
  fetch: app.fetch,
  port,
});

console.log(`[server] Ready on http://localhost:${port}`);
