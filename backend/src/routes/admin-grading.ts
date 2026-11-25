import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import type { Pool } from '@/db/connection';
import { createExamDb } from '@/services/exam-service';
import { createReportDb } from '@/services/report-service';
import { getGradingDetail, gradeEssayAnswer, listGradingQueue } from '@/services/grading-service';
import { rowMatchesAdminScope, sessionClassIds } from '@/lib/admin-scope';

const gradeSchema = z.object({
  score_percent: z.number().min(0).max(100).optional(),
  score_fraction: z.number().min(0).max(1).optional(),
}).refine((value) => value.score_percent !== undefined || value.score_fraction !== undefined, {
  message: 'Nilai wajib diisi sebagai score_percent (0-100) atau score_fraction (0-1).',
});

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function adminGradingRoutes(pool: Pool) {
  const db = createReportDb(pool);
  const examDb = createExamDb(pool);
  const app = new Hono();

  function scopedFilters(c: Context) {
    const session = c.get('adminSession');
    return session?.role === 'editor'
      ? { scope_subject_id: session.subject_id ?? undefined, scope_class_ids: sessionClassIds(session), scope_owner_username: session.username }
      : {};
  }

  app.get('/queue', async (c) => {
    const rows = await listGradingQueue(db, scopedFilters(c));
    return c.json({ rows });
  });

  app.get('/attempts/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid_param', message: 'ID percobaan tidak valid.' }, 400);
    const detail = await getGradingDetail(db, id);
    if (!detail) return c.json({ error: 'not_found', message: 'Hasil asesmen tidak ditemukan.' }, 404);
    if (!rowMatchesAdminScope(c.get('adminSession'), detail.attempt)) return c.json({ error: 'not_found', message: 'Hasil asesmen tidak ditemukan.' }, 404);
    return c.json({ detail });
  });

  app.post('/attempts/:id/answers/:answerId', async (c) => {
    const attemptId = parseId(c.req.param('id'));
    const answerId = parseId(c.req.param('answerId'));
    if (!attemptId || !answerId) return c.json({ error: 'invalid_param', message: 'ID percobaan atau jawaban tidak valid.' }, 400);

    let body: unknown = null;
    try {
      body = await c.req.json();
    } catch {
      body = null;
    }
    const parsed = gradeSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'invalid_body', message: parsed.error.issues[0]?.message ?? 'Nilai tidak valid.' }, 400);

    const detail = await getGradingDetail(db, attemptId);
    if (!detail) return c.json({ error: 'not_found', message: 'Hasil asesmen tidak ditemukan.' }, 404);
    if (!rowMatchesAdminScope(c.get('adminSession'), detail.attempt)) return c.json({ error: 'not_found', message: 'Hasil asesmen tidak ditemukan.' }, 404);

    const fraction = parsed.data.score_fraction ?? (parsed.data.score_percent as number) / 100;
    const gradedBy = c.get('adminSession')?.username ?? 'env-admin';
    const result = await gradeEssayAnswer(db, examDb, attemptId, answerId, fraction, gradedBy);
    if (!result.graded) {
      if (result.reason === 'attempt_not_completed') {
        return c.json({ error: 'attempt_not_completed', message: 'Penilaian hanya untuk percobaan yang sudah selesai.' }, 409);
      }
      return c.json({ error: 'not_found', message: 'Jawaban uraian tidak ditemukan.' }, 404);
    }
    return c.json({ result });
  });

  return app;
}
