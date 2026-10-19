import type { Context, Next } from 'hono';
import { getAdminSession } from '../lib/admin-auth-store';

export async function requireAdminAuth(c: Context, next: Next) {
  const token = c.req.header('x-admin-token');

  const session = getAdminSession(token);
  if (!session) {
    return c.json({ error: 'admin_unauthorized', message: 'Akses editor ditolak. Silakan login admin.' }, 401);
  }

  c.set('adminSession', session);
  await next();
}
