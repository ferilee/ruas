import { Hono } from 'hono';
import { z } from 'zod';
import type { Pool } from '@/db/connection';
import {
  createAdminDb,
  createAdminTopic,
  deleteAdminTopic,
  listAdminTopics,
  updateAdminTopic,
  updateAdminTopicAccess,
} from '@/services/admin-question-service';

const topicAccessSchema = z.object({
  requires_token: z.boolean(),
  token: z.string().trim().max(100).optional(),
});

const topicSchema = z.object({
  subject_id: z.coerce.number().int().positive(),
  slug: z.string().trim().min(1).max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.'),
  label: z.string().trim().min(1).max(100),
  display_order: z.coerce.number().int().positive(),
});

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function adminTopicsRoutes(pool: Pool) {
  const db = createAdminDb(pool);
  const app = new Hono();

  app.get('/', async (c) => c.json({ topics: await listAdminTopics(db) }));

  app.post('/', async (c) => {
    const parsed = topicSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: 'Data topik tidak valid.' }, 400);
    try {
      const id = await createAdminTopic(db, parsed.data);
      if (id === null) return c.json({ error: 'invalid_reference', message: 'Mata pelajaran tidak ditemukan.' }, 400);
      return c.json({ id }, 201);
    } catch (error) {
      if (isDuplicateKeyError(error)) return c.json({ error: 'duplicate_slug', message: 'Slug topik sudah digunakan.' }, 409);
      throw error;
    }
  });

  app.put('/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const parsed = topicSchema.safeParse(await c.req.json());
    if (!id || !parsed.success) return c.json({ error: 'invalid_body', message: 'Data topik tidak valid.' }, 400);
    try {
      const result = await updateAdminTopic(db, id, parsed.data);
      if (result === 'not_found') return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
      if (result === 'invalid_subject') return c.json({ error: 'invalid_reference', message: 'Mata pelajaran tidak ditemukan.' }, 400);
      return c.json({ updated: true });
    } catch (error) {
      if (isDuplicateKeyError(error)) return c.json({ error: 'duplicate_slug', message: 'Slug topik sudah digunakan.' }, 409);
      throw error;
    }
  });

  app.delete('/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid_param', message: 'ID topik tidak valid.' }, 400);
    const result = await deleteAdminTopic(db, id);
    if (result === 'not_found') return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
    if (result === 'in_use') return c.json({ error: 'in_use', message: 'Topik sudah dipakai dalam riwayat asesmen dan tidak dapat dihapus.' }, 409);
    return c.json({ deleted: true });
  });

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

function isDuplicateKeyError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; errno?: number };
  return candidate.code === 'ER_DUP_ENTRY' || candidate.errno === 1062;
}
