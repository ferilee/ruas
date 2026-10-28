import { createApp } from './app';
import { createPool } from './db/connection';
import { applyMigrations } from './db/migrate';
import { loadConfig } from './config';
import { createExamDb, expireOverdueAttempts } from './services/exam-service';
import { createMediaStorage } from './services/media-storage';

const pool = createPool();

const migrationPool = createPool({ multipleStatements: true });
try {
  await applyMigrations(migrationPool);
} finally {
  await migrationPool.end();
}

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
const mediaStorage = config.RUSTFS_ENDPOINT && config.RUSTFS_ACCESS_KEY && config.RUSTFS_SECRET_KEY
  ? createMediaStorage({
    endpoint: config.RUSTFS_ENDPOINT,
    publicEndpoint: config.RUSTFS_PUBLIC_ENDPOINT || config.RUSTFS_ENDPOINT,
    accessKey: config.RUSTFS_ACCESS_KEY,
    secretKey: config.RUSTFS_SECRET_KEY,
    bucket: config.RUSTFS_BUCKET,
    region: config.RUSTFS_REGION,
  })
  : null;

if (!mediaStorage) console.log('[media] RustFS belum dikonfigurasi; upload gambar dinonaktifkan.');

const app = createApp({
  pool,
  corsOrigin: config.CORS_ORIGIN,
  appUsername: config.APP_USERNAME,
  schoolName: config.SCHOOL_NAME,
  appPassword: config.APP_PASSWORD,
  adminPassword: config.ADMIN_PASSWORD,
  examExitPassword: config.EXAM_EXIT_PASSWORD,
  mediaStorage,
});

const port = config.APP_PORT;

console.log(`[server] Starting on http://localhost:${port}`);

Bun.serve({
  fetch: app.fetch,
  port,
});

console.log(`[server] Ready on http://localhost:${port}`);
