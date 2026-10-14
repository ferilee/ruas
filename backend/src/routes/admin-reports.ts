import { Hono } from 'hono';
import { z } from 'zod';
import type { Pool } from '@/db/connection';
import { countReportAttempts, createReportDb, getReportDetail, listReportAttempts, resetAllReportData, summarizeReport, summarizeReportByClass } from '@/services/report-service';

const querySchema = z.object({
  status: z.enum(['all', 'in_progress', 'completed', 'abandoned']).default('completed'),
  score_policy: z.enum(['best', 'latest', 'average']).default('best'),
  subject_id: z.coerce.number().int().positive().optional(),
  class_id: z.coerce.number().int().positive().optional(),
  assessment_type_id: z.coerce.number().int().positive().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().max(100).optional(),
});

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function adminReportRoutes(pool: Pool) {
  const db = createReportDb(pool);
  const app = new Hono();

  app.get('/reset/summary', async (c) => c.json({ attempts: await countReportAttempts(db) }));

  app.delete('/reset', async (c) => {
    let body: unknown = {};
    try {
      body = await c.req.json();
    } catch {
      // The validation response below is enough when the request has no JSON body.
    }
    const parsed = z.object({ confirmation: z.literal('RESET HASIL ASESMEN') }).safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'confirmation_required', message: 'Ketik RESET HASIL ASESMEN untuk menghapus seluruh hasil asesmen.' }, 400);
    }

    const deleted = await resetAllReportData(db);
    return c.json({ deleted });
  });

  app.get('/', async (c) => {
    const parsed = querySchema.safeParse(c.req.query());
    if (!parsed.success) return c.json({ error: 'invalid_query', message: 'Filter laporan tidak valid.' }, 400);
    if (parsed.data.from && parsed.data.to && parsed.data.from > parsed.data.to) {
      return c.json({ error: 'invalid_query', message: 'Tanggal mulai harus sebelum tanggal selesai.' }, 400);
    }
    const rows = await listReportAttempts(db, parsed.data);
    return c.json({ filters: parsed.data, summary: summarizeReport(rows, parsed.data.score_policy), class_statistics: summarizeReportByClass(rows, parsed.data.score_policy), rows });
  });

  app.get('/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid_param', message: 'ID percobaan tidak valid.' }, 400);
    const report = await getReportDetail(db, id);
    if (!report) return c.json({ error: 'not_found', message: 'Hasil asesmen tidak ditemukan.' }, 404);
    return c.json({ report });
  });

  return app;
}
