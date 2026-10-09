import { Hono } from 'hono';
import { z } from 'zod';
import type { Pool } from '@/db/connection';
import { createAdminDb, listAdminTopics, updateAdminTopicAccess } from '@/services/admin-question-service';

const topicAccessSchema = z.object({
  requires_token: z.boolean(),
  token: z.string().trim().max(100).optional(),
});

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function adminTopicsRoutes(pool: Pool) {
  const db = createAdminDb(pool);
  const app = new Hono();

  app.get('/', async (c) => c.json({ topics: await listAdminTopics(db) }));

  app.patch('/:id/access', async (c) => {
    const id = parseId(c.req.param('id'));
    const parsed = topicAccessSchema.safeParse(await c.req.json());
    if (!id || !parsed.success) return c.json({ error: 'invalid_body', message: 'Pengaturan token topik tidak valid.' }, 400);

    const updated = await updateAdminTopicAccess(db, id, parsed.data);
    if (!updated) return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
    if ('missingToken' in updated) return c.json({ error: 'token_required', message: 'Masukkan token sebelum mengaktifkan penguncian topik.' }, 400);
    return c.json({ topic: updated });
  });

  return app;
}
