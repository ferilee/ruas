import { Hono } from 'hono';
import { duplicateFieldResponse, invalidBodyResponse } from '@/lib/validation-error';
import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import type { Context } from 'hono';
import type { Pool } from '@/db/connection';
import * as schema from '@/db/schema';
import {
  createAdminDb,
  createAdminTopic,
  deleteAdminTopic,
  listAdminTopics,
  updateAdminTopic,
  updateAdminTopicAccess,
} from '@/services/admin-question-service';
import { topicInputMatchesAdminScope, topicMatchesAdminScope } from '@/lib/admin-scope';

const topicAccessSchema = z.object({
  token: z.string().trim().max(100).optional(),
});

const topicSchema = z.object({
  subject_id: z.coerce.number().int().positive(),
  slug: z.string().trim().min(1).max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.'),
  label: z.string().trim().min(1).max(100),
  display_order: z.coerce.number().int().positive(),
  class_ids: z.array(z.coerce.number().int().positive()).default([]).transform((ids) => [...new Set(ids)]),
});

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function canUseResource(c: Context, resource: { created_by?: string | null } | null | undefined) {
  const session = c.get('adminSession');
  if (!session || session.role === 'admin') return true;
  return resource?.created_by === null || resource?.created_by === undefined || resource?.created_by === 'env-admin' || resource?.created_by === session.username;
}

function canManageTopic(c: Context, topic: { created_by?: string | null } | null | undefined) {
  const session = c.get('adminSession');
  return !session || session.role === 'admin' || topic?.created_by === session.username;
}

export function adminTopicsRoutes(pool: Pool) {
  const db = createAdminDb(pool);
  const app = new Hono();

  async function inputIsAllowed(c: Context, input: { subject_id: number; class_ids: number[] }) {
    const session = c.get('adminSession');
    if (!session || session.role === 'admin') return true;
    const [subject] = await db.select({ id: schema.subjects.id, created_by: schema.subjects.created_by }).from(schema.subjects).where(eq(schema.subjects.id, input.subject_id)).limit(1);
    if (!subject || !canUseResource(c, subject)) return false;
    if (session?.role === 'editor' && subject.created_by !== session.username && !topicInputMatchesAdminScope(session, input)) return false;
    if (input.class_ids.length === 0) return true;
    const classRows = await db.select({ id: schema.educationClasses.id, created_by: schema.educationClasses.created_by }).from(schema.educationClasses).where(inArray(schema.educationClasses.id, input.class_ids));
    return classRows.length === input.class_ids.length && classRows.every((row) => canUseResource(c, row));
  }

  app.get('/', async (c) => {
    const session = c.get('adminSession');
    const topics = await listAdminTopics(db);
    return c.json({ topics: session?.role === 'editor' ? topics.filter((topic) => topicMatchesAdminScope(session, topic)) : topics });
  });

  app.post('/', async (c) => {
    const parsed = topicSchema.safeParse(await c.req.json());
    if (!parsed.success) return invalidBodyResponse(c, 'Data topik tidak valid.', parsed.error);
    if (!(await inputIsAllowed(c, parsed.data))) {
      return c.json({ error: 'admin_forbidden', message: 'Topik harus berada pada mata pelajaran dan kelas yang ditetapkan untuk akun ini.' }, 403);
    }
    try {
      const session = c.get('adminSession');
      const id = session?.role === 'editor'
        ? await createAdminTopic(db, parsed.data, session.username)
        : await createAdminTopic(db, parsed.data);
      if (id === 'invalid_subject') return c.json({ error: 'invalid_reference', message: 'Mata pelajaran tidak ditemukan.', fields: { subject_id: 'Mata pelajaran tidak ditemukan. Pilih mata pelajaran yang tersedia.' } }, 400);
      if (id === 'invalid_class') return c.json({ error: 'invalid_reference', message: 'Salah satu kelas topik tidak ditemukan.' }, 400);
      return c.json({ id }, 201);
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateFieldResponse(c, 'slug', 'Slug topik sudah digunakan. Ganti slug topik dengan yang lain.');
      throw error;
    }
  });

  app.put('/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const parsed = topicSchema.safeParse(await c.req.json());
    if (!parsed.success) return invalidBodyResponse(c, 'Data topik tidak valid.', parsed.error);
    if (!id) return c.json({ error: 'invalid_param', message: 'ID tidak valid.' }, 400);
    const session = c.get('adminSession');
    const existing = session?.role === 'editor' ? (await listAdminTopics(db)).find((topic) => topic.id === id) : null;
    if (session?.role === 'editor' && (!existing || !topicMatchesAdminScope(session, existing) || !canManageTopic(c, existing) || !(await inputIsAllowed(c, parsed.data)))) {
      return c.json({ error: 'admin_forbidden', message: 'Topik berada di luar penetapan akun ini.' }, 403);
    }
    try {
      const result = await updateAdminTopic(db, id, parsed.data);
      if (result === 'not_found') return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
      if (result === 'invalid_subject') return c.json({ error: 'invalid_reference', message: 'Mata pelajaran tidak ditemukan.', fields: { subject_id: 'Mata pelajaran tidak ditemukan. Pilih mata pelajaran yang tersedia.' } }, 400);
      if (result === 'invalid_class') return c.json({ error: 'invalid_reference', message: 'Salah satu kelas topik tidak ditemukan.' }, 400);
      return c.json({ updated: true });
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateFieldResponse(c, 'slug', 'Slug topik sudah digunakan. Ganti slug topik dengan yang lain.');
      throw error;
    }
  });

  app.delete('/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid_param', message: 'ID topik tidak valid.' }, 400);
    const session = c.get('adminSession');
    if (session?.role === 'editor') {
      const existing = (await listAdminTopics(db)).find((topic) => topic.id === id);
      if (!existing) return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
      if (!canManageTopic(c, existing)) return c.json({ error: 'admin_forbidden', message: 'Topik bersama hanya dapat dihapus Admin.' }, 403);
      if (!topicMatchesAdminScope(session, existing)) return c.json({ error: 'admin_forbidden', message: 'Topik berada di luar penetapan akun ini.' }, 403);
    }
    const result = await deleteAdminTopic(db, id);
    if (result === 'not_found') return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
    if (result === 'in_use') return c.json({ error: 'in_use', message: 'Topik sudah dipakai dalam riwayat asesmen dan tidak dapat dihapus.' }, 409);
    return c.json({ deleted: true });
  });

  app.patch('/:id/access', async (c) => {
    const id = parseId(c.req.param('id'));
    const parsed = topicAccessSchema.safeParse(await c.req.json());
    if (!parsed.success) return invalidBodyResponse(c, 'Pengaturan token topik tidak valid.', parsed.error);
    if (!id) return c.json({ error: 'invalid_param', message: 'ID tidak valid.' }, 400);
    const session = c.get('adminSession');
    if (session?.role === 'editor') {
      const existing = (await listAdminTopics(db)).find((topic) => topic.id === id);
      if (!existing) return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
      if (!canManageTopic(c, existing)) return c.json({ error: 'admin_forbidden', message: 'Akses topik bersama hanya dapat diubah Admin.' }, 403);
      if (!topicMatchesAdminScope(session, existing)) return c.json({ error: 'admin_forbidden', message: 'Topik berada di luar penetapan akun ini.' }, 403);
    }

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
