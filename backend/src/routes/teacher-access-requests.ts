import { Hono } from 'hono';
import { z } from 'zod';
import type { Pool } from '@/db/connection';
import { createTeacherAccessRequest, createTeacherRequestDb } from '@/services/teacher-access-request-service';

const requestSchema = z.object({
  username: z.string().trim().min(3).max(100).regex(/^[A-Za-z0-9._@+-]+$/, 'Username mengandung karakter yang tidak didukung.'),
  display_name: z.string().trim().min(2).max(150),
  password: z.string().min(8).max(200),
  confirm_password: z.string().min(8).max(200),
  contact: z.string().trim().max(150).optional().default(''),
  requested_class: z.string().trim().max(150).optional().default(''),
  requested_subject: z.string().trim().max(150).optional().default(''),
}).refine((value) => value.password === value.confirm_password, {
  path: ['confirm_password'],
  message: 'Konfirmasi sandi tidak sama.',
});

export function teacherAccessRequestRoutes(pool: Pool) {
  const db = createTeacherRequestDb(pool);
  const app = new Hono();

  app.post('/', async (c) => {
    const parsed = requestSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: parsed.error.issues[0]?.message ?? 'Data pengajuan tidak valid.' }, 400);
    const result = await createTeacherAccessRequest(db, {
      ...parsed.data,
      contact: parsed.data.contact || null,
      requested_class: parsed.data.requested_class || null,
      requested_subject: parsed.data.requested_subject || null,
    });
    if (result === 'username_taken') return c.json({ error: 'username_taken', message: 'Username sudah digunakan.' }, 409);
    if (result === 'already_pending') return c.json({ error: 'already_pending', message: 'Pengajuan dengan username ini masih menunggu persetujuan Admin.' }, 409);
    return c.json({ request: { id: result, status: 'pending' } }, 201);
  });

  return app;
}
