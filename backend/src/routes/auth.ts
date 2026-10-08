import { Hono } from 'hono';
import { z } from 'zod';
import { createToken } from '../lib/auth-store';
import type { Pool } from '../db/connection';
import { authenticateUser, createUserDb, hasUsers } from '../services/user-service';

const authBodySchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export function authRoutes(validUsername: string, validPassword: string, pool?: Pool) {
  const app = new Hono();
  const getDb = () => (pool ? createUserDb(pool) : null);

  app.get('/', async (c) => {
    const db = getDb();
    return c.json({ auth_enabled: Boolean(validPassword) || Boolean(db && (await hasUsers(db))) });
  });

  app.post('/', async (c) => {
    const db = getDb();
    const databaseAuthEnabled = Boolean(db && (await hasUsers(db)));
    if (!validPassword && !databaseAuthEnabled) {
      return c.json({ error: 'auth_disabled', message: 'Autentikasi tidak aktif.' }, 400);
    }

    const body = await c.req.json();
    const parsed = authBodySchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: 'invalid_body', message: 'Username dan password wajib diisi.' }, 400);
    }

    const databaseUser = db ? await authenticateUser(db, parsed.data.username, parsed.data.password) : null;
    const validLegacyCredentials =
      Boolean(validPassword) &&
      (!validUsername || parsed.data.username === validUsername) &&
      parsed.data.password === validPassword;

    if (!databaseUser && !validLegacyCredentials) {
      return c.json({ error: 'unauthorized', message: 'Username atau password salah.' }, 401);
    }

    const token = createToken(databaseUser?.username ?? parsed.data.username);
    return c.json({ token });
  });

  return app;
}
