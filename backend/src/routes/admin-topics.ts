import { Hono } from 'hono';
import type { Pool } from '@/db/connection';
import { createAdminDb, listAdminTopics } from '@/services/admin-question-service';

export function adminTopicsRoutes(pool: Pool) {
  const db = createAdminDb(pool);
  const app = new Hono();

  app.get('/', async (c) => c.json({ topics: await listAdminTopics(db) }));

  return app;
}
