import { Hono } from 'hono';
import { z } from 'zod';
import type { Context } from 'hono';
import type { Pool } from '@/db/connection';
import { getAdminSession } from '@/lib/admin-auth-store';
import { createTeacherRequestDb, listTeacherAccessRequests, reviewTeacherAccessRequest } from '@/services/teacher-access-request-service';

const statusSchema = z.enum(['pending', 'approved', 'rejected', 'all']).default('pending');
const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejection_reason: z.string().trim().max(500).optional().default(''),
});

function currentAdmin(c: Context) {
  return getAdminSession(c.req.header('x-admin-token'));
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function adminTeacherRequestRoutes(pool: Pool) {
  const db = createTeacherRequestDb(pool);
  const app = new Hono();

  app.get('/', async (c) => {
    const session = currentAdmin(c);
    if (session?.role !== 'admin') return c.json({ error: 'admin_forbidden', message: 'Hanya Admin yang dapat mengelola pengajuan guru.' }, 403);
    const parsed = statusSchema.safeParse(c.req.query('status') ?? 'pending');
    if (!parsed.success) return c.json({ error: 'invalid_query', message: 'Status pengajuan tidak valid.' }, 400);
    return c.json({ requests: await listTeacherAccessRequests(db, parsed.data) });
  });

  app.patch('/:id', async (c) => {
    const session = currentAdmin(c);
    if (session?.role !== 'admin') return c.json({ error: 'admin_forbidden', message: 'Hanya Admin yang dapat memproses pengajuan guru.' }, 403);
    const id = parseId(c.req.param('id'));
    const parsed = reviewSchema.safeParse(await c.req.json());
    if (!id || !parsed.success) return c.json({ error: 'invalid_body', message: 'Tindakan pengajuan tidak valid.' }, 400);
    if (parsed.data.action === 'reject' && !parsed.data.rejection_reason) {
      return c.json({ error: 'reason_required', message: 'Alasan penolakan wajib diisi.' }, 400);
    }
    const result = await reviewTeacherAccessRequest(db, id, parsed.data.action, session.username, parsed.data.rejection_reason || null);
    if (result === 'not_found') return c.json({ error: 'not_found', message: 'Pengajuan tidak ditemukan.' }, 404);
    if (result === 'already_reviewed') return c.json({ error: 'already_reviewed', message: 'Pengajuan ini sudah diproses.' }, 409);
    if (result === 'username_taken') return c.json({ error: 'username_taken', message: 'Username sudah digunakan oleh akun lain.' }, 409);
    return c.json({ status: result });
  });

  return app;
}
