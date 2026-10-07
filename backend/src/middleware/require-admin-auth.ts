import type { Context, Next } from 'hono';
import { isValidAdminToken } from '../lib/admin-auth-store';

export async function requireAdminAuth(c: Context, next: Next) {
  const token = c.req.header('x-admin-token');

  if (!isValidAdminToken(token)) {
    return c.json({ error: 'admin_unauthorized', message: 'Akses editor ditolak. Silakan login admin.' }, 401);
  }

  await next();
}
