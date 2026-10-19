import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { assessmentTypes } from '@/db/schema/assessment-types';
import { educationClasses } from '@/db/schema/education-classes';
import { subjects } from '@/db/schema/subjects';
import type { Pool } from '@/db/connection';
import {
  countSubjectsForAssessmentType,
  countTopicMappingsForClass,
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

const classSchema = itemSchema.extend({
  slug: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/, 'Kode kelas hanya boleh berisi huruf, angka, dan tanda hubung.').transform((value) => value.toLowerCase()),
  academic_year: z.string().trim().min(4).max(20),
  grade: z.coerce.number().int().min(1).max(12),
  program: z.string().trim().min(1).max(50),
  section: z.preprocess((value) => (value === '' || value === undefined ? null : value), z.string().trim().max(20).nullable()),
});

const subjectSchema = itemSchema.extend({
  max_attempts: z.coerce.number().int().min(0).max(100).default(1),
  duration_minutes: z.coerce.number().int().min(0).max(1440).default(0),
  minimum_duration_minutes: z.coerce.number().int().min(0).max(1440).default(0),
  explanation_mode: z.enum(['after_answer', 'after_exam', 'hidden']).default('hidden'),
  show_correct_answer_on_wrong: z.coerce.boolean().default(false),
  shuffle_questions: z.coerce.boolean().default(false),
  shuffle_options: z.coerce.boolean().default(false),
  class_id: z.coerce.number().int().positive().nullable(),
  assessment_type_id: z.coerce.number().int().positive().nullable(),
}).superRefine((value, context) => {
  if (value.duration_minutes > 0 && value.minimum_duration_minutes > value.duration_minutes) {
    context.addIssue({ code: 'custom', path: ['minimum_duration_minutes'], message: 'Minimum waktu tidak boleh melebihi durasi ujian.' });
  }
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

  app.get('/', async (c) => {
    const data = await listCurriculum(db);
    const session = c.get('adminSession');
    if (!session || session.role === 'admin') return c.json(data);
    const subjectsInScope = session.subject_id === null
      ? []
      : data.subjects.filter((subject) => subject.id === session.subject_id);
    const assessmentTypeIds = new Set(subjectsInScope.map((subject) => subject.assessment_type_id).filter((id): id is number => id !== null));
    return c.json({
      classes: session.class_id === null ? data.classes : data.classes.filter((item) => item.id === session.class_id),
      assessment_types: data.assessment_types.filter((item) => assessmentTypeIds.has(item.id)),
      subjects: subjectsInScope,
    });
  });

  app.post('/classes', async (c) => {
    const parsed = classSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: 'Data kelas tidak valid.' }, 400);
    const [result] = await db.insert(educationClasses).values(parsed.data);
    return c.json({ id: Number(result.insertId) }, 201);
  });

  app.put('/classes/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const parsed = classSchema.safeParse(await c.req.json());
    if (!id || !parsed.success) return c.json({ error: 'invalid_body', message: 'Data kelas tidak valid.' }, 400);
    if (!(await findClass(db, id))) return c.json({ error: 'not_found', message: 'Kelas tidak ditemukan.' }, 404);
    await db.update(educationClasses).set(parsed.data).where(eq(educationClasses.id, id));
    return c.json({ updated: true });
  });

  app.delete('/classes/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid_param', message: 'ID kelas tidak valid.' }, 400);
    if ((await countTopicMappingsForClass(db, id)) > 0) return c.json({ error: 'in_use', message: 'Kelas masih digunakan oleh pemetaan topik.' }, 409);
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
      const [result] = await db.insert(subjects).values({ ...parsed.data, class_id: null });
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
      await db.update(subjects).set({ ...parsed.data, class_id: null }).where(eq(subjects.id, id));
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
