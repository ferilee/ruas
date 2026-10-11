import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Pool } from '@/db/connection';
import { adminQuestionSchema, importPayloadSchema, importRequestSchema } from '@/validators/admin-question-validator';
import { parseQuestionIdParam } from '@/validators/question-validator';
import {
  createAdminDb,
  createAdminQuestion,
  deleteAdminQuestion,
  findAdminQuestion,
  importAdminQuestions,
  listAdminQuestions,
  updateAdminQuestion,
} from '@/services/admin-question-service';

async function readJson(c: Context) {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

export function adminQuestionRoutes(pool: Pool) {
  const db = createAdminDb(pool);
  const app = new Hono();

  app.get('/', async (c) => {
    const search = c.req.query('search');
    return c.json({ questions: await listAdminQuestions(db, search) });
  });

  app.get('/:id', async (c) => {
    const id = parseQuestionIdParam(c.req.param('id'));
    if (id === null) return c.json({ error: 'invalid_param', message: 'ID soal tidak valid.' }, 400);

    const question = await findAdminQuestion(db, id);
    if (!question) return c.json({ error: 'not_found', message: 'Soal tidak ditemukan.' }, 404);
    return c.json({ question });
  });

  app.post('/', async (c) => {
    const parsed = adminQuestionSchema.safeParse(await readJson(c));
    if (!parsed.success) return c.json({ error: 'invalid_body', message: parsed.error.issues[0]?.message ?? 'Data soal tidak valid.' }, 400);

    const id = await createAdminQuestion(db, parsed.data);
    if (id === null) return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
    return c.json({ question_id: id }, 201);
  });

  app.put('/:id', async (c) => {
    const id = parseQuestionIdParam(c.req.param('id'));
    if (id === null) return c.json({ error: 'invalid_param', message: 'ID soal tidak valid.' }, 400);

    const parsed = adminQuestionSchema.safeParse(await readJson(c));
    if (!parsed.success) return c.json({ error: 'invalid_body', message: parsed.error.issues[0]?.message ?? 'Data soal tidak valid.' }, 400);

    const updated = await updateAdminQuestion(db, id, parsed.data);
    if (!updated) return c.json({ error: 'not_found', message: 'Soal atau topik tidak ditemukan.' }, 404);
    return c.json({ updated: true });
  });

  app.delete('/:id', async (c) => {
    const id = parseQuestionIdParam(c.req.param('id'));
    if (id === null) return c.json({ error: 'invalid_param', message: 'ID soal tidak valid.' }, 400);

    const deleted = await deleteAdminQuestion(db, id);
    if (!deleted) return c.json({ error: 'not_found', message: 'Soal tidak ditemukan.' }, 404);
    return c.json({ deleted: true });
  });

  app.post('/import', async (c) => {
    const request = importRequestSchema.safeParse(await readJson(c));
    if (!request.success) return c.json({ error: 'invalid_body', message: 'Payload import tidak valid.' }, 400);

    const data = importPayloadSchema.safeParse(request.data.data);
    if (!data.success) return c.json({ error: 'invalid_import', message: data.error.issues[0]?.message ?? 'Format JSON soal tidak valid.' }, 400);

    const questions = Array.isArray(data.data) ? data.data : data.data.questions;
    const summary = await importAdminQuestions(db, questions, request.data.mode, request.data.dry_run);

    if (summary.errors.length > 0) {
      const details = summary.errors.slice(0, 3).join(' ');
      const remaining = summary.errors.length - Math.min(summary.errors.length, 3);
      const suffix = remaining > 0 ? ` Dan ${remaining} error lainnya.` : '';
      return c.json({ error: 'import_validation_failed', message: `Import gagal. ${details}${suffix}`, summary }, 400);
    }

    return c.json({ summary });
  });

  return app;
}
