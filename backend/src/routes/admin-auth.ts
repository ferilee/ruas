import { Hono } from 'hono';
import { createAdminToken, getAdminSession, type AdminRole } from '../lib/admin-auth-store';
import { createUserDb, findUserByUsername, hasAdminUsers, listEffectiveUserClassIds } from '@/services/user-service';
import { getTokenUsername } from '../lib/auth-store';
import type { Pool } from '@/db/connection';

export function adminAuthRoutes(validPassword: string, pool: Pool) {
  let db: ReturnType<typeof createUserDb> | null = null;
  const getDb = () => {
    db ??= createUserDb(pool);
    return db;
  };
  const app = new Hono();

  // Sesi editor membawa seluruh kelas tempat guru terpetakan (relasi
  // user_classes, fallback class_id tunggal lama). class_id dipertahankan
  // sebagai kelas pertama untuk kompatibilitas tampilan lama.
  async function sessionForUser(user: NonNullable<Awaited<ReturnType<typeof findUserByUsername>>>) {
    const classIds = await listEffectiveUserClassIds(getDb(), user);
    return {
      username: user.username,
      display_name: user.display_name,
      // Pemanggil sudah memastikan peran admin/editor sebelum membangun sesi.
      role: user.role as AdminRole,
      subject_id: user.subject_id,
      class_id: user.class_id,
      class_ids: classIds,
    };
  }

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
    const session = await sessionForUser(user);
    return c.json({ token: createAdminToken(session), session });
  });

  // Tidak ada lagi endpoint login langsung di sini: semua pengguna —
  // murid, guru/editor, dan admin bawaan (env-admin) — masuk lewat satu
  // form login utama (POST /api/auth). Ruang kerja dibuka lewat jembatan
  // sesi di atas, atau token admin yang diterbitkan form utama untuk
  // env-admin.

  return app;
}
