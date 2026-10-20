import { Hono } from 'hono';
import { z } from 'zod';
import type { Context } from 'hono';
import type { Pool } from '@/db/connection';
import { getAdminSession } from '@/lib/admin-auth-store';
import { createFeedback, createFeedbackDb, listFeedback, listPublishedTestimonials, reviewFeedback } from '@/services/feedback-service';

const submitSchema = z.object({
  kind: z.enum(['suggestion', 'testimonial']),
  message: z.string().trim().min(10, 'Isi masukan minimal 10 karakter.').max(3000),
  display_name: z.string().trim().min(2).max(150),
  role_label: z.string().trim().min(2).max(100),
  consent_public: z.boolean().default(false),
});

const statusSchema = z.enum(['pending', 'approved', 'rejected', 'all']).default('pending');

function currentSession(c: Context) {
  return getAdminSession(c.req.header('x-admin-token'));
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function feedbackRoutes(pool: Pool) {
  let db: ReturnType<typeof createFeedbackDb> | null = null;
  const getDb = () => {
    db ??= createFeedbackDb(pool);
    return db;
  };
  const app = new Hono();

  app.get('/testimonials', async (c) => c.json({ testimonials: await listPublishedTestimonials(getDb()) }));

  app.post('/admin/feedback', async (c) => {
    const session = currentSession(c);
    if (!session) return c.json({ error: 'admin_unauthorized', message: 'Sesi editor tidak ditemukan.' }, 401);
    const parsed = submitSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: parsed.error.issues[0]?.message ?? 'Masukan tidak valid.' }, 400);
    if (parsed.data.kind === 'testimonial' && !parsed.data.consent_public) {
      return c.json({ error: 'consent_required', message: 'Persetujuan publik wajib diaktifkan untuk testimoni.' }, 400);
    }
    const id = await createFeedback(getDb(), {
      ...parsed.data,
      username: session.username,
    });
    return c.json({ feedback: { id, status: 'pending' } }, 201);
  });

  app.get('/admin/feedback', async (c) => {
    const session = currentSession(c);
    if (session?.role !== 'admin') return c.json({ error: 'admin_forbidden', message: 'Hanya Admin yang dapat melihat antrean moderasi.' }, 403);
    const parsed = statusSchema.safeParse(c.req.query('status') ?? 'pending');
    if (!parsed.success) return c.json({ error: 'invalid_query', message: 'Status feedback tidak valid.' }, 400);
    return c.json({ feedback: await listFeedback(getDb(), parsed.data) });
  });

  app.patch('/admin/feedback/:id', async (c) => {
    const session = currentSession(c);
    if (session?.role !== 'admin') return c.json({ error: 'admin_forbidden', message: 'Hanya Admin yang dapat memoderasi testimoni.' }, 403);
    const id = parseId(c.req.param('id'));
    const bodySchema = z.object({ action: z.enum(['approve', 'reject']), rejection_reason: z.string().trim().max(500).optional().default('') });
    const parsed = bodySchema.safeParse(await c.req.json());
    if (!id || !parsed.success) return c.json({ error: 'invalid_body', message: 'Tindakan moderasi tidak valid.' }, 400);
    if (parsed.data.action === 'reject' && !parsed.data.rejection_reason) return c.json({ error: 'reason_required', message: 'Alasan penolakan wajib diisi.' }, 400);
    const result = await reviewFeedback(getDb(), id, parsed.data.action, session.username, parsed.data.rejection_reason || null);
    if (result === 'not_found') return c.json({ error: 'not_found', message: 'Masukan tidak ditemukan.' }, 404);
    if (result === 'already_reviewed') return c.json({ error: 'already_reviewed', message: 'Masukan ini sudah diproses.' }, 409);
    return c.json({ status: result });
  });

  return app;
}
