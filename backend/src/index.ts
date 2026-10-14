import { createApp } from './app';
import { createPool } from './db/connection';
import { applyMigrations } from './db/migrate';
import { loadConfig } from './config';
import { createExamDb, expireOverdueAttempts } from './services/exam-service';

const pool = createPool();

await applyMigrations(pool);

const examDb = createExamDb(pool);
const runAttemptExpiry = async () => {
  try {
    const completed = await expireOverdueAttempts(examDb);
    if (completed > 0) console.log(`[attempt-expiry] Completed ${completed} overdue attempt(s).`);
  } catch (error) {
    console.error('[attempt-expiry] Failed to complete overdue attempts.', error);
  }
};

await runAttemptExpiry();
setInterval(() => void runAttemptExpiry(), 15_000);

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
