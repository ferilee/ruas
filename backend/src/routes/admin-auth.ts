import { Hono } from 'hono';
import { z } from 'zod';
import { createAdminToken } from '../lib/admin-auth-store';

const authBodySchema = z.object({
  password: z.string().min(1),
});

export function adminAuthRoutes(validPassword: string) {
  const app = new Hono();

  app.get('/', (c) => c.json({ admin_auth_enabled: Boolean(validPassword) }));

  app.post('/', async (c) => {
    if (!validPassword) {
      return c.json({ error: 'admin_auth_disabled', message: 'Editor admin belum diaktifkan.' }, 400);
    }

    const parsed = authBodySchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: 'invalid_body', message: 'Password admin wajib diisi.' }, 400);
    }

    if (parsed.data.password !== validPassword) {
      return c.json({ error: 'unauthorized', message: 'Password admin salah.' }, 401);
    }

    return c.json({ token: createAdminToken() });
  });

  return app;
}
