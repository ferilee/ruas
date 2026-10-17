import type { Context, Next } from 'hono';
import { getTokenUsername } from '../lib/auth-store';
import type { Pool } from '../db/connection';
import { createUserDb, findUserByUsername, hasUsers } from '../services/user-service';

export function createRequireAuth(pool: Pool, legacyPassword: string) {
  return async function requireAuth(c: Context, next: Next) {
    const db = createUserDb(pool);
    if (!legacyPassword && !(await hasUsers(db))) {
      await next();
      return;
    }

    const token = c.req.header('x-auth-token');

    const username = getTokenUsername(token);
    if (!username) {
      return c.json({ error: 'unauthorized', message: 'Akses ditolak. Silakan login.' }, 401);
    }

    c.set('authUsername', username);
    const user = await findUserByUsername(db, username);
    if (user?.must_change_password && !user.is_demo) {
      return c.json({ error: 'password_change_required', message: 'Silakan ubah sandi terlebih dahulu.' }, 403);
    }
    await next();
  };
}

export async function requireAuth(c: Context, next: Next) {
  const token = c.req.header('x-auth-token');

  const username = getTokenUsername(token);
  if (!username) {
    return c.json({ error: 'unauthorized', message: 'Akses ditolak. Silakan login.' }, 401);
  }

  c.set('authUsername', username);
  await next();
}
