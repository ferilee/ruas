import { Hono } from 'hono';
import type { Pool } from '@/db/connection';
import { createCurriculumDb, listCurriculum } from '@/services/curriculum-service';

export function curriculumRoutes(pool: Pool) {
  const db = createCurriculumDb(pool);
  const app = new Hono();

  app.get('/', async (c) => c.json(await listCurriculum(db)));

  return app;
}
