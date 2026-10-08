import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { assessmentTypes } from '@/db/schema/assessment-types';
import { educationClasses } from '@/db/schema/education-classes';
import { subjects } from '@/db/schema/subjects';
import type { Pool } from '@/db/connection';
import {
  countSubjectsForAssessmentType,
  countSubjectsForClass,
  countAttemptsForSubject,
  countProfilesForSubject,
  createCurriculumDb,
  deleteSubjectWithContent,
  findAssessmentType,
  findClass,
  findSubject,
  listCurriculum,
} from '@/services/curriculum-service';

const itemSchema = z.object({
  slug: z.string().trim().min(1).max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.'),
  label: z.string().trim().min(1).max(100),
  display_order: z.coerce.number().int().positive(),
});

const subjectSchema = itemSchema.extend({
  class_id: z.coerce.number().int().positive().nullable(),
  assessment_type_id: z.coerce.number().int().positive().nullable(),
});

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isDuplicateKeyError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; errno?: number };
  return candidate.code === 'ER_DUP_ENTRY' || candidate.errno === 1062;
}

export function adminCurriculumRoutes(pool: Pool) {
  const db = createCurriculumDb(pool);
  const app = new Hono();

  app.get('/', async (c) => c.json(await listCurriculum(db)));

  app.post('/classes', async (c) => {
    const parsed = itemSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: 'Data kelas tidak valid.' }, 400);
    const [result] = await db.insert(educationClasses).values(parsed.data);
    return c.json({ id: Number(result.insertId) }, 201);
  });

  app.put('/classes/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const parsed = itemSchema.safeParse(await c.req.json());
    if (!id || !parsed.success) return c.json({ error: 'invalid_body', message: 'Data kelas tidak valid.' }, 400);
    if (!(await findClass(db, id))) return c.json({ error: 'not_found', message: 'Kelas tidak ditemukan.' }, 404);
    await db.update(educationClasses).set(parsed.data).where(eq(educationClasses.id, id));
    return c.json({ updated: true });
  });

  app.delete('/classes/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid_param', message: 'ID kelas tidak valid.' }, 400);
    if ((await countSubjectsForClass(db, id)) > 0) return c.json({ error: 'in_use', message: 'Kelas masih digunakan oleh mata pelajaran.' }, 409);
    if (!(await findClass(db, id))) return c.json({ error: 'not_found', message: 'Kelas tidak ditemukan.' }, 404);
    await db.delete(educationClasses).where(eq(educationClasses.id, id));
    return c.json({ deleted: true });
  });

  app.post('/assessment-types', async (c) => {
    const parsed = itemSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: 'Jenis asesmen tidak valid.' }, 400);
    const [result] = await db.insert(assessmentTypes).values(parsed.data);
    return c.json({ id: Number(result.insertId) }, 201);
  });

  app.put('/assessment-types/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const parsed = itemSchema.safeParse(await c.req.json());
    if (!id || !parsed.success) return c.json({ error: 'invalid_body', message: 'Jenis asesmen tidak valid.' }, 400);
    if (!(await findAssessmentType(db, id))) return c.json({ error: 'not_found', message: 'Jenis asesmen tidak ditemukan.' }, 404);
    await db.update(assessmentTypes).set(parsed.data).where(eq(assessmentTypes.id, id));
    return c.json({ updated: true });
  });

  app.delete('/assessment-types/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid_param', message: 'ID jenis asesmen tidak valid.' }, 400);
    if ((await countSubjectsForAssessmentType(db, id)) > 0) return c.json({ error: 'in_use', message: 'Jenis asesmen masih digunakan oleh mata pelajaran.' }, 409);
    if (!(await findAssessmentType(db, id))) return c.json({ error: 'not_found', message: 'Jenis asesmen tidak ditemukan.' }, 404);
    await db.delete(assessmentTypes).where(eq(assessmentTypes.id, id));
    return c.json({ deleted: true });
  });

  app.post('/subjects', async (c) => {
    const parsed = subjectSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: 'Mata pelajaran tidak valid.' }, 400);
    if (parsed.data.class_id && !(await findClass(db, parsed.data.class_id))) return c.json({ error: 'invalid_reference', message: 'Kelas tidak ditemukan.' }, 400);
    if (parsed.data.assessment_type_id && !(await findAssessmentType(db, parsed.data.assessment_type_id))) return c.json({ error: 'invalid_reference', message: 'Jenis asesmen tidak ditemukan.' }, 400);
    try {
      const [result] = await db.insert(subjects).values(parsed.data);
      return c.json({ id: Number(result.insertId) }, 201);
    } catch (error) {
      if (isDuplicateKeyError(error)) return c.json({ error: 'duplicate_slug', message: 'Slug mata pelajaran sudah digunakan.' }, 409);
      throw error;
    }
  });

  app.put('/subjects/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const parsed = subjectSchema.safeParse(await c.req.json());
    if (!id || !parsed.success) return c.json({ error: 'invalid_body', message: 'Mata pelajaran tidak valid.' }, 400);
    if (!(await findSubject(db, id))) return c.json({ error: 'not_found', message: 'Mata pelajaran tidak ditemukan.' }, 404);
    if (parsed.data.class_id && !(await findClass(db, parsed.data.class_id))) return c.json({ error: 'invalid_reference', message: 'Kelas tidak ditemukan.' }, 400);
    if (parsed.data.assessment_type_id && !(await findAssessmentType(db, parsed.data.assessment_type_id))) return c.json({ error: 'invalid_reference', message: 'Jenis asesmen tidak ditemukan.' }, 400);
    try {
      await db.update(subjects).set(parsed.data).where(eq(subjects.id, id));
      return c.json({ updated: true });
    } catch (error) {
      if (isDuplicateKeyError(error)) return c.json({ error: 'duplicate_slug', message: 'Slug mata pelajaran sudah digunakan.' }, 409);
      throw error;
    }
  });

  app.delete('/subjects/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid_param', message: 'ID mata pelajaran tidak valid.' }, 400);
    if (!(await findSubject(db, id))) return c.json({ error: 'not_found', message: 'Mata pelajaran tidak ditemukan.' }, 404);
    if ((await countProfilesForSubject(db, id)) > 0 || (await countAttemptsForSubject(db, id)) > 0) {
      return c.json({ error: 'in_use', message: 'Mata pelajaran sudah dipakai oleh profil atau riwayat ujian dan tidak dapat dihapus.' }, 409);
    }
    const deleted = await deleteSubjectWithContent(db, id);
    return c.json({ deleted: true, ...deleted });
  });

  return app;
}
