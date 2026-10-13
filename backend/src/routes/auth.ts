import { Hono } from 'hono';
import { z } from 'zod';
import { createDemoToken, createToken } from '../lib/auth-store';
import type { Pool } from '../db/connection';
import { authenticateUser, createUserDb, findDemoUser, hasUsers } from '../services/user-service';
import { createDemoDb, prepareDemoSession } from '../services/demo-service';

const authBodySchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export function authRoutes(validUsername: string, validPassword: string, pool?: Pool) {
  const app = new Hono();
  const getDb = () => (pool ? createUserDb(pool) : null);

  app.get('/', async (c) => {
    const db = getDb();
    const demoUser = db ? await findDemoUser(db) : null;
    return c.json({ auth_enabled: Boolean(validPassword) || Boolean(db && (await hasUsers(db))), demo_available: Boolean(demoUser?.subject_id) });
  });

  app.get('/demo', async (c) => {
    const db = getDb();
    const demoUser = db ? await findDemoUser(db) : null;
    return c.json({ available: Boolean(demoUser?.subject_id) });
  });

  app.post('/demo', async (c) => {
    if (!pool) return c.json({ error: 'demo_unavailable', message: 'Mode demo belum dikonfigurasi.' }, 404);
    const userDb = createUserDb(pool);
    const demoUser = await findDemoUser(userDb);
    if (!demoUser?.subject_id) {
      return c.json({ error: 'demo_unavailable', message: 'Mode demo belum disiapkan oleh admin.' }, 404);
    }

    const ready = await prepareDemoSession(createDemoDb(pool), demoUser);
    if (!ready) return c.json({ error: 'demo_unavailable', message: 'Mode demo belum memiliki mata pelajaran.' }, 409);
    return c.json({ token: createDemoToken(demoUser.username), demo_mode: true });
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

    if (databaseUser?.is_demo && pool) {
      const ready = await prepareDemoSession(createDemoDb(pool), databaseUser);
      if (!ready) return c.json({ error: 'demo_unavailable', message: 'Mode demo belum memiliki mata pelajaran.' }, 409);
    }

    const token = databaseUser?.is_demo ? createDemoToken(databaseUser.username) : createToken(databaseUser?.username ?? parsed.data.username);
    return c.json({ token });
  });

  return app;
}
