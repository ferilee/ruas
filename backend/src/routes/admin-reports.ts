import { Hono } from 'hono';
import { z } from 'zod';
import type { Pool } from '@/db/connection';
import { createReportDb, getReportDetail, listReportAttempts, summarizeReport } from '@/services/report-service';

const querySchema = z.object({
  status: z.enum(['all', 'in_progress', 'completed', 'abandoned']).default('completed'),
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

  app.get('/', async (c) => {
    const parsed = querySchema.safeParse(c.req.query());
    if (!parsed.success) return c.json({ error: 'invalid_query', message: 'Filter laporan tidak valid.' }, 400);
    if (parsed.data.from && parsed.data.to && parsed.data.from > parsed.data.to) {
      return c.json({ error: 'invalid_query', message: 'Tanggal mulai harus sebelum tanggal selesai.' }, 400);
    }
    const rows = await listReportAttempts(db, parsed.data);
    return c.json({ filters: parsed.data, summary: summarizeReport(rows), rows });
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
