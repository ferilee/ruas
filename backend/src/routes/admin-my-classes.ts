import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';
import { educationClasses } from '@/db/schema/education-classes';
import { users } from '@/db/schema/users';
import type { Pool } from '@/db/connection';
import {
  addUserClass,
  countParticipantsByClassId,
  createUserDb,
  findUserByUsername,
  listEffectiveUserClassIds,
  listUserClassMappings,
  removeUserClass,
  type UserClassMapping,
} from '@/services/user-service';
import type { AdminSession } from '@/lib/admin-auth-store';

const addClassSchema = z.object({
  class_id: z.coerce.number().int().positive(),
});

// Self-pick kelas untuk guru: guru hanya dapat membaca daftar kelas master
// dan menambah/melepas petaan untuk akunnya sendiri. Kelas master tetap
// hanya dibuat Admin; guru tidak dapat memetakan pengguna lain.
export function adminMyClassesRoutes(pool: Pool) {
  const db = createUserDb(pool);
  const app = new Hono();

  async function teacherContext(c: Context) {
    const session = c.get('adminSession') as AdminSession | undefined;
    if (!session || session.role !== 'editor') {
      return { response: c.json({ error: 'admin_forbidden', message: 'Fitur kelas saya hanya untuk akun guru.' }, 403) };
    }
    const user = await findUserByUsername(db, session.username);
    if (!user) {
      return { response: c.json({ error: 'not_found', message: 'Akun guru tidak ditemukan.' }, 404) };
    }
    return { session, user };
  }

  async function payload(user: NonNullable<Awaited<ReturnType<typeof findUserByUsername>>>) {
    const masterClasses = await db
      .select({ id: educationClasses.id, slug: educationClasses.slug, label: educationClasses.label, academic_year: educationClasses.academic_year })
      .from(educationClasses)
      .orderBy(asc(educationClasses.display_order), asc(educationClasses.id));
    // Jumlah siswa per kelas untuk ringkasan guru; kelas tanpa siswa = 0.
    const studentCounts = await countParticipantsByClassId(db);
    const classes = masterClasses.map((educationClass) => ({ ...educationClass, student_count: studentCounts.get(educationClass.id) ?? 0 }));
    const mappingMap = await listUserClassMappings(db, [user.id]);
    let mappings: UserClassMapping[] = mappingMap.get(user.id) ?? [];
    if (mappings.length === 0 && user.class_id) {
      // Akun lama: class_id tunggal ditampilkan sebagai petaan admin.
      mappings = [{ class_id: user.class_id, source: 'admin', created_by: null, created_at: null }];
    }
    return { classes, mappings };
  }

  // Sesi editor bersifat in-memory; segarkan daftar kelasnya agar perubahan
  // petaan langsung berlaku tanpa login ulang.
  async function refreshSession(c: Context, user: NonNullable<Awaited<ReturnType<typeof findUserByUsername>>>) {
    const session = c.get('adminSession') as AdminSession | undefined;
    if (!session) return;
    session.class_ids = await listEffectiveUserClassIds(db, user);
    session.class_id = user.class_id;
  }

  app.get('/', async (c) => {
    const context = await teacherContext(c);
    if (context.response) return context.response;
    return c.json(await payload(context.user));
  });

  app.post('/', async (c) => {
    const context = await teacherContext(c);
    if (context.response) return context.response;
    const parsed = addClassSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: 'invalid_body', message: 'Pilih kelas yang akan ditambahkan.', fields: { class_id: 'Pilih kelas terlebih dahulu.' } }, 400);
    }
    const [educationClass] = await db.select({ id: educationClasses.id }).from(educationClasses).where(eq(educationClasses.id, parsed.data.class_id)).limit(1);
    if (!educationClass) {
      return c.json({ error: 'invalid_reference', message: 'Kelas tidak ditemukan.', fields: { class_id: 'Kelas tidak ditemukan. Muat ulang daftar kelas lalu coba lagi.' } }, 400);
    }
    const effective = await listEffectiveUserClassIds(db, context.user);
    if (!effective.includes(parsed.data.class_id)) {
      await addUserClass(db, context.user.id, parsed.data.class_id, { source: 'self', createdBy: context.user.username });
    }
    await refreshSession(c, context.user);
    return c.json(await payload(context.user));
  });

  app.delete('/:classId', async (c) => {
    const context = await teacherContext(c);
    if (context.response) return context.response;
    const classId = Number(c.req.param('classId'));
    if (!Number.isInteger(classId) || classId <= 0) {
      return c.json({ error: 'invalid_param', message: 'ID kelas tidak valid.' }, 400);
    }
    await removeUserClass(db, context.user.id, classId);
    let user = context.user;
    if (user.class_id === classId) {
      // Petaan hanya berasal dari class_id tunggal lama: kosongkan juga
      // kolom lamanya agar pelepasan benar-benar berlaku.
      await db.update(users).set({ class_id: null, updated_at: new Date() }).where(eq(users.id, user.id));
      user = { ...user, class_id: null };
    }
    await refreshSession(c, user);
    return c.json(await payload(user));
  });

  return app;
}
