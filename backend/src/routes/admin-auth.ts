import { Hono } from 'hono';
import { z } from 'zod';
import { createAdminToken, getAdminSession } from '../lib/admin-auth-store';
import { authenticateUser, createUserDb, findUserByUsername, hasAdminUsers } from '@/services/user-service';
import { getTokenUsername } from '../lib/auth-store';
import type { Pool } from '@/db/connection';

const authBodySchema = z.object({
  username: z.string().trim().max(100).optional(),
  password: z.string().min(1),
});

export function adminAuthRoutes(validPassword: string, pool: Pool) {
  let db: ReturnType<typeof createUserDb> | null = null;
  const getDb = () => {
    db ??= createUserDb(pool);
    return db;
  };
  const app = new Hono();

  app.get('/', async (c) => c.json({
    admin_auth_enabled: Boolean(validPassword) || await hasAdminUsers(getDb()),
    session: getAdminSession(c.req.header('x-admin-token')),
  }));

  // RUAS-004: jembatan sesi — pengguna yang sudah login di situs utama
  // (token x-auth-token) tidak perlu login kedua untuk membuka editor,
  // selama akun database-nya berperan admin/editor.
  app.post('/session', async (c) => {
    const username = getTokenUsername(c.req.header('x-auth-token'));
    if (!username) {
      return c.json({ error: 'unauthorized', message: 'Sesi login utama tidak ditemukan. Silakan masuk melalui halaman login.' }, 401);
    }
    const user = await findUserByUsername(getDb(), username);
    if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
      return c.json({ error: 'unauthorized', message: 'Akun ini tidak memiliki akses editor.' }, 403);
    }
    if (user.must_change_password && !user.is_demo) {
      return c.json({ error: 'password_change_required', message: 'Ganti sandi awal terlebih dahulu melalui halaman login utama (/auth), lalu masuk kembali sebagai Admin/Guru.' }, 403);
    }
    if (!user.active) {
      return c.json({ error: 'unauthorized', message: 'Akun ini sedang nonaktif.' }, 403);
    }
    const session = {
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      subject_id: user.subject_id,
      class_id: user.class_id,
    };
    return c.json({ token: createAdminToken(session), session });
  });

  app.post('/', async (c) => {
    const parsed = authBodySchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: 'invalid_body', message: 'Username dan password wajib diisi.' }, 400);
    }

    if (parsed.data.username) {
      const user = await authenticateUser(getDb(), parsed.data.username, parsed.data.password);
      if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
        return c.json({ error: 'unauthorized', message: 'Username atau password admin/guru salah.' }, 401);
      }
      if (user.must_change_password && !user.is_demo) {
        return c.json({ error: 'password_change_required', message: 'Ganti sandi awal terlebih dahulu melalui halaman login utama (/auth), lalu masuk kembali sebagai Admin/Guru.' }, 403);
      }
      return c.json({ token: createAdminToken({
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        subject_id: user.subject_id,
        class_id: user.class_id,
      }), session: {
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        subject_id: user.subject_id,
        class_id: user.class_id,
      } });
    }

    if (!validPassword) {
      return c.json({ error: 'admin_auth_disabled', message: 'Admin belum diaktifkan.' }, 400);
    }
    if (parsed.data.password !== validPassword) {
      return c.json({ error: 'unauthorized', message: 'Password admin salah.' }, 401);
    }

    return c.json({ token: createAdminToken(), session: {
      username: 'env-admin', display_name: 'Admin RUAS', role: 'admin', subject_id: null, class_id: null,
    } });
  });

  return app;
}
