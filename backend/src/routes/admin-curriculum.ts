import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { assessmentTypes } from '@/db/schema/assessment-types';
import { educationClasses } from '@/db/schema/education-classes';
import { subjects } from '@/db/schema/subjects';
import { topics } from '@/db/schema/topics';
import { topicClasses } from '@/db/schema/topic-classes';
import type { Pool } from '@/db/connection';
import {
  countSubjectsForAssessmentType,
  countTopicMappingsForClass,
  countUserMappingsForClass,
  countAttemptsForSubject,
  countProfilesForSubject,
  createCurriculumDb,
  deleteSubjectWithContent,
  findAssessmentType,
  findClass,
  findSubject,
  listCurriculum,
} from '@/services/curriculum-service';
import { parseCurriculumCsv, type ParsedCurriculumImportRow } from '@/services/curriculum-import-service';
import { duplicateFieldResponse, invalidBodyResponse } from '@/lib/validation-error';
import { sessionClassIds } from '@/lib/admin-scope';

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

const curriculumImportSchema = z.object({
  csv: z.string().trim().min(1).max(2_000_000),
  mode: z.enum(['insert', 'upsert']).default('insert'),
  dry_run: z.boolean().default(false),
});

type CurriculumDb = ReturnType<typeof createCurriculumDb>;
type CurriculumClassRow = typeof educationClasses.$inferSelect;
type AssessmentTypeRow = typeof assessmentTypes.$inferSelect;
type SubjectRow = typeof subjects.$inferSelect;
type TopicRow = typeof topics.$inferSelect;

interface CurriculumImportSummary {
  total_rows: number;
  valid_rows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  preview: Array<{ line: number; topic: string; subject: string; class_name: string; action: 'new' | 'update' | 'skip' }>;
}

interface CurriculumImportEntities {
  classes: Map<string, ParsedCurriculumImportRow>;
  assessmentTypes: Map<string, ParsedCurriculumImportRow>;
  subjects: Map<string, ParsedCurriculumImportRow>;
  topics: Map<string, { row: ParsedCurriculumImportRow; classSlugs: Set<string> }>;
}

function mergeImportEntity(
  target: Map<string, ParsedCurriculumImportRow>,
  key: string,
  row: ParsedCurriculumImportRow,
  fields: Array<keyof ParsedCurriculumImportRow>,
  errors: string[],
) {
  const existing = target.get(key);
  if (!existing) {
    target.set(key, row);
    return;
  }
  const changed = fields.some((field) => existing[field] !== row[field]);
  if (changed) errors.push(`Baris ${row.line}: data ${key} tidak konsisten dengan baris sebelumnya.`);
}

function buildImportEntities(rows: ParsedCurriculumImportRow[], errors: string[]): CurriculumImportEntities {
  const entities: CurriculumImportEntities = { classes: new Map(), assessmentTypes: new Map(), subjects: new Map(), topics: new Map() };
  for (const row of rows) {
    if (row.class_slug) {
      mergeImportEntity(entities.classes, row.class_slug, row, ['class_name', 'academic_year', 'grade', 'program', 'section', 'class_order'], errors);
    }
    mergeImportEntity(entities.assessmentTypes, row.assessment_type_slug, row, ['assessment_type_name', 'assessment_type_order'], errors);
    mergeImportEntity(entities.subjects, row.subject_slug, row, ['subject_name', 'subject_order', 'assessment_type_slug'], errors);
    const topicKey = row.topic_slug;
    const existingTopic = entities.topics.get(topicKey);
    if (!existingTopic) {
      entities.topics.set(topicKey, { row, classSlugs: row.class_slug ? new Set([row.class_slug]) : new Set() });
    } else {
      if (existingTopic.row.subject_slug !== row.subject_slug || existingTopic.row.topic_name !== row.topic_name || existingTopic.row.topic_order !== row.topic_order) {
        errors.push(`Baris ${row.line}: data topik ${topicKey} tidak konsisten dengan baris sebelumnya.`);
      }
      if (row.class_slug) existingTopic.classSlugs.add(row.class_slug);
    }
  }
  return entities;
}

async function loadImportState(db: CurriculumDb) {
  const [classes, assessmentTypeRows, subjectRows, topicRows] = await Promise.all([
    db.select().from(educationClasses),
    db.select().from(assessmentTypes),
    db.select().from(subjects),
    db.select().from(topics),
  ]);
  return {
    classes: new Map(classes.map((item) => [item.slug, item])),
    assessmentTypes: new Map(assessmentTypeRows.map((item) => [item.slug, item])),
    subjects: new Map(subjectRows.map((item) => [item.slug, item])),
    topics: new Map(topicRows.map((item) => [item.slug, item])),
  };
}

type ImportAction = 'new' | 'update' | 'skip';
interface ImportEntityPlan<T> { key: string; row: ParsedCurriculumImportRow; existing: T | undefined; action: ImportAction; }
interface ImportTopicPlan extends ImportEntityPlan<TopicRow> { classSlugs: Set<string>; }
interface CurriculumImportPlan {
  summary: CurriculumImportSummary;
  classes: Array<ImportEntityPlan<CurriculumClassRow>>;
  assessmentTypes: Array<ImportEntityPlan<AssessmentTypeRow>>;
  subjects: Array<ImportEntityPlan<SubjectRow>>;
  topics: Array<ImportTopicPlan>;
}

function importAction(existing: { created_by?: string | null } | undefined, mode: 'insert' | 'upsert', canUpdate: boolean): ImportAction {
  if (!existing) return 'new';
  return mode === 'upsert' && canUpdate ? 'update' : 'skip';
}

function pushImportError(errors: string[], message: string) {
  if (!errors.includes(message)) errors.push(message);
}

function buildImportPlan(
  c: Context,
  rows: ParsedCurriculumImportRow[],
  parseErrors: string[],
  entities: CurriculumImportEntities,
  state: Awaited<ReturnType<typeof loadImportState>>,
  mode: 'insert' | 'upsert',
): CurriculumImportPlan {
  const errors = [...parseErrors];
  const classes: Array<ImportEntityPlan<CurriculumClassRow>> = [];
  const assessmentTypes: Array<ImportEntityPlan<AssessmentTypeRow>> = [];
  const subjects: Array<ImportEntityPlan<SubjectRow>> = [];
  const topicsPlan: Array<ImportTopicPlan> = [];

  for (const [key, row] of entities.classes) {
    const existing = state.classes.get(key);
    if (existing && !canUseResource(c, existing)) pushImportError(errors, `Baris ${row.line}: kelas ${key} berada di luar workspace Anda.`);
    classes.push({ key, row, existing, action: importAction(existing, mode, canManageResource(c, existing)) });
  }
  for (const [key, row] of entities.assessmentTypes) {
    const existing = state.assessmentTypes.get(key);
    if (existing && !canUseResource(c, existing)) pushImportError(errors, `Baris ${row.line}: jenis asesmen ${key} berada di luar workspace Anda.`);
    assessmentTypes.push({ key, row, existing, action: importAction(existing, mode, canManageResource(c, existing)) });
  }
  for (const [key, row] of entities.subjects) {
    const existing = state.subjects.get(key);
    const assessmentType = state.assessmentTypes.get(row.assessment_type_slug);
    if (existing && !canUseResource(c, existing)) pushImportError(errors, `Baris ${row.line}: mata pelajaran ${key} berada di luar workspace Anda.`);
    if (existing && assessmentType && existing.assessment_type_id !== null && existing.assessment_type_id !== assessmentType.id) {
      pushImportError(errors, `Baris ${row.line}: mata pelajaran ${key} sudah terhubung ke jenis asesmen lain.`);
    }
    subjects.push({ key, row, existing, action: importAction(existing, mode, canManageResource(c, existing)) });
  }
  for (const [key, topic] of entities.topics) {
    const existing = state.topics.get(key);
    const subject = state.subjects.get(topic.row.subject_slug);
    if (existing && !canUseResource(c, existing)) pushImportError(errors, `Baris ${topic.row.line}: topik ${key} berada di luar workspace Anda.`);
    if (existing && subject && existing.subject_id !== subject.id) pushImportError(errors, `Baris ${topic.row.line}: topik ${key} sudah terhubung ke mata pelajaran lain.`);
    for (const classSlug of topic.classSlugs) {
      const educationClass = state.classes.get(classSlug);
      if (educationClass && !canUseResource(c, educationClass)) pushImportError(errors, `Baris ${topic.row.line}: kelas ${classSlug} berada di luar workspace Anda.`);
    }
    topicsPlan.push({ key, row: topic.row, existing, classSlugs: topic.classSlugs, action: importAction(existing, mode, canManageResource(c, existing)) });
  }

  const preview = rows.slice(0, 200).map((row) => {
    const topic = topicsPlan.find((item) => item.key === row.topic_slug);
    return {
      line: row.line,
      topic: row.topic_name,
      subject: row.subject_name,
      class_name: row.class_name || 'Semua kelas',
      action: topic?.action ?? 'skip',
    };
  });
  const plans = [...classes, ...assessmentTypes, ...subjects, ...topicsPlan];
  return {
    summary: {
      total_rows: rows.length + parseErrors.length,
      valid_rows: rows.length,
      inserted: plans.filter((item) => item.action === 'new').length,
      updated: plans.filter((item) => item.action === 'update').length,
      skipped: plans.filter((item) => item.action === 'skip').length,
      errors,
      preview,
    },
    classes,
    assessmentTypes,
    subjects,
    topics: topicsPlan,
  };
}

async function applyImportPlan(db: CurriculumDb, c: Context, plan: CurriculumImportPlan) {
  await db.transaction(async (tx) => {
    const classIds = new Map<string, number>();
    const assessmentTypeIds = new Map<string, number>();
    const subjectIds = new Map<string, number>();
    const topicIds = new Map<string, number>();

    for (const item of plan.classes) {
      if (item.existing) {
        classIds.set(item.key, item.existing.id);
        if (item.action === 'update') await tx.update(educationClasses).set({ label: item.row.class_name, academic_year: item.row.academic_year, grade: item.row.grade, program: item.row.program, section: item.row.section, display_order: item.row.class_order }).where(eq(educationClasses.id, item.existing.id));
      } else {
        const [result] = await tx.insert(educationClasses).values({ slug: item.key, label: item.row.class_name, academic_year: item.row.academic_year, grade: item.row.grade, program: item.row.program, section: item.row.section, display_order: item.row.class_order, created_by: ownerForCreate(c) });
        classIds.set(item.key, Number(result.insertId));
      }
    }
    for (const item of plan.assessmentTypes) {
      if (item.existing) {
        assessmentTypeIds.set(item.key, item.existing.id);
        if (item.action === 'update') await tx.update(assessmentTypes).set({ label: item.row.assessment_type_name, display_order: item.row.assessment_type_order }).where(eq(assessmentTypes.id, item.existing.id));
      } else {
        const [result] = await tx.insert(assessmentTypes).values({ slug: item.key, label: item.row.assessment_type_name, display_order: item.row.assessment_type_order, created_by: ownerForCreate(c) });
        assessmentTypeIds.set(item.key, Number(result.insertId));
      }
    }
    for (const item of plan.subjects) {
      const assessmentTypeId = assessmentTypeIds.get(item.row.assessment_type_slug) ?? stateId(plan.assessmentTypes, item.row.assessment_type_slug);
      if (!assessmentTypeId) throw new Error(`Jenis asesmen ${item.row.assessment_type_slug} tidak ditemukan.`);
      if (item.existing) {
        subjectIds.set(item.key, item.existing.id);
        if (item.action === 'update') await tx.update(subjects).set({ label: item.row.subject_name, display_order: item.row.subject_order, assessment_type_id: assessmentTypeId }).where(eq(subjects.id, item.existing.id));
      } else {
        const [result] = await tx.insert(subjects).values({ slug: item.key, label: item.row.subject_name, display_order: item.row.subject_order, assessment_type_id: assessmentTypeId, class_id: null, created_by: ownerForCreate(c) });
        subjectIds.set(item.key, Number(result.insertId));
      }
    }
    for (const item of plan.topics) {
      const subjectId = subjectIds.get(item.row.subject_slug) ?? stateId(plan.subjects, item.row.subject_slug);
      if (!subjectId) throw new Error(`Mata pelajaran ${item.row.subject_slug} tidak ditemukan.`);
      const mappedClassIds = [...item.classSlugs].map((slug) => classIds.get(slug) ?? stateId(plan.classes, slug)).filter((id): id is number => Boolean(id));
      let topicId: number;
      if (item.existing) {
        topicId = item.existing.id;
        if (item.action === 'update') {
          await tx.update(topics).set({ subject_id: subjectId, label: item.row.topic_name, display_order: item.row.topic_order }).where(eq(topics.id, topicId));
          await tx.delete(topicClasses).where(eq(topicClasses.topic_id, topicId));
          if (mappedClassIds.length > 0) await tx.insert(topicClasses).values(mappedClassIds.map((classId) => ({ topic_id: topicId, class_id: classId })));
        }
      } else {
        const [result] = await tx.insert(topics).values({ subject_id: subjectId, slug: item.key, label: item.row.topic_name, display_order: item.row.topic_order, created_by: ownerForCreate(c) });
        topicId = Number(result.insertId);
        if (mappedClassIds.length > 0) await tx.insert(topicClasses).values(mappedClassIds.map((classId) => ({ topic_id: topicId, class_id: classId })));
      }
      topicIds.set(item.key, topicId);
    }
  });
}

function stateId<T extends { key: string; existing?: { id: number } }>(plans: Array<T>, key: string) {
  return plans.find((item) => item.key === key)?.existing?.id;
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isDuplicateKeyError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; errno?: number };
  return candidate.code === 'ER_DUP_ENTRY' || candidate.errno === 1062;
}

function ownerForCreate(c: Context) {
  const session = c.get('adminSession');
  return session?.role === 'editor' ? session.username : null;
}

function canUseResource(c: Context, resource: { created_by?: string | null } | null | undefined) {
  const session = c.get('adminSession');
  if (!session || session.role === 'admin') return true;
  return resource?.created_by === null || resource?.created_by === undefined || resource?.created_by === 'env-admin' || resource?.created_by === session.username;
}

function canManageResource(c: Context, resource: { created_by?: string | null } | null | undefined) {
  const session = c.get('adminSession');
  return !session || session.role === 'admin' || resource?.created_by === session.username;
}

export function adminCurriculumRoutes(pool: Pool) {
  const db = createCurriculumDb(pool);
  const app = new Hono();

  app.get('/', async (c) => {
    const data = await listCurriculum(db);
    const session = c.get('adminSession');
    if (!session || session.role === 'admin') return c.json(data);
    const owned = <T extends { created_by?: string | null }>(items: T[]) => items.filter((item) => canUseResource(c, item));
    const classesInScope = owned(data.classes);
    const typesInScope = owned(data.assessment_types);
    const subjectsInScope = owned(data.subjects);
    const classIds = sessionClassIds(session);
    return c.json({
      classes: classIds.length === 0 ? classesInScope : classesInScope.filter((item) => classIds.includes(item.id) || item.created_by === session.username),
      assessment_types: typesInScope,
      subjects: subjectsInScope,
    });
  });

  app.post('/import', async (c) => {
    const parsedRequest = curriculumImportSchema.safeParse(await c.req.json());
    if (!parsedRequest.success) return invalidBodyResponse(c, 'Data impor struktur asesmen tidak valid.', parsedRequest.error);
    const parsedCsv = parseCurriculumCsv(parsedRequest.data.csv);
    const entities = buildImportEntities(parsedCsv.rows, parsedCsv.errors);
    const state = await loadImportState(db);
    const plan = buildImportPlan(c, parsedCsv.rows, parsedCsv.errors, entities, state, parsedRequest.data.mode);
    if (parsedRequest.data.dry_run) return c.json({ summary: plan.summary });
    if (plan.summary.errors.length > 0) {
      return c.json({ error: 'invalid_import', message: 'Perbaiki data yang ditandai sebelum menerapkan impor.', summary: plan.summary }, 400);
    }
    try {
      await applyImportPlan(db, c, plan);
      return c.json({ summary: plan.summary });
    } catch (error) {
      if (isDuplicateKeyError(error)) return c.json({ error: 'duplicate_slug', message: 'Ada slug yang sudah digunakan oleh data lain.', fields: { slug: 'Ada slug yang sudah digunakan oleh data lain.' }, summary: plan.summary }, 409);
      throw error;
    }
  });

  app.post('/classes', async (c) => {
    // Kelas master adalah satu sumber kebenaran milik Admin; guru tidak lagi
    // membuat kelas master baru (kelas lama buatan guru tetap berfungsi dan
    // tetap dapat diubah pemiliknya lewat PUT /classes/:id).
    if (c.get('adminSession')?.role === 'editor') {
      return c.json({ error: 'admin_forbidden', message: 'Kelas master hanya dapat dibuat Admin. Pilih kelas yang sudah tersedia atau usulkan kelas baru kepada Admin.' }, 403);
    }
    const parsed = classSchema.safeParse(await c.req.json());
    if (!parsed.success) return invalidBodyResponse(c, 'Data kelas tidak valid.', parsed.error);
    try {
      const [result] = await db.insert(educationClasses).values({ ...parsed.data, created_by: ownerForCreate(c) });
      return c.json({ id: Number(result.insertId) }, 201);
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateFieldResponse(c, 'slug', 'Kode kelas sudah digunakan. Ganti kode kelas dengan yang lain.');
      throw error;
    }
  });

  app.put('/classes/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const parsed = classSchema.safeParse(await c.req.json());
    if (!parsed.success) return invalidBodyResponse(c, 'Data kelas tidak valid.', parsed.error);
    if (!id) return c.json({ error: 'invalid_param', message: 'ID tidak valid.' }, 400);
    const existing = await findClass(db, id);
    if (!existing) return c.json({ error: 'not_found', message: 'Kelas tidak ditemukan.' }, 404);
    if (!canManageResource(c, existing)) return c.json({ error: 'admin_forbidden', message: 'Kelas bersama hanya dapat diubah Admin.' }, 403);
    try {
      await db.update(educationClasses).set(parsed.data).where(eq(educationClasses.id, id));
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateFieldResponse(c, 'slug', 'Kode kelas sudah digunakan. Ganti kode kelas dengan yang lain.');
      throw error;
    }
    return c.json({ updated: true });
  });

  app.delete('/classes/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid_param', message: 'ID kelas tidak valid.' }, 400);
    const existing = await findClass(db, id);
    if (!existing) return c.json({ error: 'not_found', message: 'Kelas tidak ditemukan.' }, 404);
    if (!canManageResource(c, existing)) return c.json({ error: 'admin_forbidden', message: 'Kelas bersama hanya dapat dihapus Admin.' }, 403);
    if ((await countTopicMappingsForClass(db, id)) > 0) return c.json({ error: 'in_use', message: 'Kelas masih digunakan oleh pemetaan topik.' }, 409);
    if ((await countUserMappingsForClass(db, id)) > 0) return c.json({ error: 'in_use', message: 'Kelas masih digunakan oleh pemetaan guru.' }, 409);
    await db.delete(educationClasses).where(eq(educationClasses.id, id));
    return c.json({ deleted: true });
  });

  app.post('/assessment-types', async (c) => {
    const parsed = itemSchema.safeParse(await c.req.json());
    if (!parsed.success) return invalidBodyResponse(c, 'Jenis asesmen tidak valid.', parsed.error);
    try {
      const [result] = await db.insert(assessmentTypes).values({ ...parsed.data, created_by: ownerForCreate(c) });
      return c.json({ id: Number(result.insertId) }, 201);
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateFieldResponse(c, 'slug', 'Slug jenis asesmen sudah digunakan. Ganti slug dengan yang lain.');
      throw error;
    }
  });

  app.put('/assessment-types/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const parsed = itemSchema.safeParse(await c.req.json());
    if (!parsed.success) return invalidBodyResponse(c, 'Jenis asesmen tidak valid.', parsed.error);
    if (!id) return c.json({ error: 'invalid_param', message: 'ID tidak valid.' }, 400);
    const existing = await findAssessmentType(db, id);
    if (!existing) return c.json({ error: 'not_found', message: 'Jenis asesmen tidak ditemukan.' }, 404);
    if (!canManageResource(c, existing)) return c.json({ error: 'admin_forbidden', message: 'Jenis asesmen bersama hanya dapat diubah Admin.' }, 403);
    try {
      await db.update(assessmentTypes).set(parsed.data).where(eq(assessmentTypes.id, id));
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateFieldResponse(c, 'slug', 'Slug jenis asesmen sudah digunakan. Ganti slug dengan yang lain.');
      throw error;
    }
    return c.json({ updated: true });
  });

  app.delete('/assessment-types/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid_param', message: 'ID jenis asesmen tidak valid.' }, 400);
    const existing = await findAssessmentType(db, id);
    if (!existing) return c.json({ error: 'not_found', message: 'Jenis asesmen tidak ditemukan.' }, 404);
    if (!canManageResource(c, existing)) return c.json({ error: 'admin_forbidden', message: 'Jenis asesmen bersama hanya dapat dihapus Admin.' }, 403);
    if ((await countSubjectsForAssessmentType(db, id)) > 0) return c.json({ error: 'in_use', message: 'Jenis asesmen masih digunakan oleh mata pelajaran.' }, 409);
    await db.delete(assessmentTypes).where(eq(assessmentTypes.id, id));
    return c.json({ deleted: true });
  });

  app.post('/subjects', async (c) => {
    const parsed = subjectSchema.safeParse(await c.req.json());
    if (!parsed.success) return invalidBodyResponse(c, 'Mata pelajaran tidak valid.', parsed.error);
    const classResource = parsed.data.class_id ? await findClass(db, parsed.data.class_id) : null;
    const typeResource = parsed.data.assessment_type_id ? await findAssessmentType(db, parsed.data.assessment_type_id) : null;
    if (parsed.data.class_id && !classResource) return c.json({ error: 'invalid_reference', message: 'Kelas tidak ditemukan.' }, 400);
    if (parsed.data.assessment_type_id && !typeResource) return c.json({ error: 'invalid_reference', message: 'Jenis asesmen tidak ditemukan.' }, 400);
    if (!canUseResource(c, classResource) || !canUseResource(c, typeResource)) return c.json({ error: 'admin_forbidden', message: 'Referensi kurikulum berada di luar workspace Anda.' }, 403);
    try {
      const [result] = await db.insert(subjects).values({ ...parsed.data, class_id: null, created_by: ownerForCreate(c) });
      return c.json({ id: Number(result.insertId) }, 201);
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateFieldResponse(c, 'slug', 'Slug mata pelajaran sudah digunakan. Ganti slug dengan yang lain.');
      throw error;
    }
  });

  app.put('/subjects/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const parsed = subjectSchema.safeParse(await c.req.json());
    if (!parsed.success) return invalidBodyResponse(c, 'Mata pelajaran tidak valid.', parsed.error);
    if (!id) return c.json({ error: 'invalid_param', message: 'ID tidak valid.' }, 400);
    const existing = await findSubject(db, id);
    if (!existing) return c.json({ error: 'not_found', message: 'Mata pelajaran tidak ditemukan.' }, 404);
    if (!canManageResource(c, existing)) return c.json({ error: 'admin_forbidden', message: 'Mata pelajaran bersama hanya dapat diubah Admin.' }, 403);
    const classResource = parsed.data.class_id ? await findClass(db, parsed.data.class_id) : null;
    const typeResource = parsed.data.assessment_type_id ? await findAssessmentType(db, parsed.data.assessment_type_id) : null;
    if (parsed.data.class_id && !classResource) return c.json({ error: 'invalid_reference', message: 'Kelas tidak ditemukan.' }, 400);
    if (parsed.data.assessment_type_id && !typeResource) return c.json({ error: 'invalid_reference', message: 'Jenis asesmen tidak ditemukan.' }, 400);
    if (!canUseResource(c, classResource) || !canUseResource(c, typeResource)) return c.json({ error: 'admin_forbidden', message: 'Referensi kurikulum berada di luar workspace Anda.' }, 403);
    try {
      await db.update(subjects).set({ ...parsed.data, class_id: null }).where(eq(subjects.id, id));
      return c.json({ updated: true });
    } catch (error) {
      if (isDuplicateKeyError(error)) return duplicateFieldResponse(c, 'slug', 'Slug mata pelajaran sudah digunakan. Ganti slug dengan yang lain.');
      throw error;
    }
  });

  app.delete('/subjects/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid_param', message: 'ID mata pelajaran tidak valid.' }, 400);
    const existing = await findSubject(db, id);
    if (!existing) return c.json({ error: 'not_found', message: 'Mata pelajaran tidak ditemukan.' }, 404);
    if (!canManageResource(c, existing)) return c.json({ error: 'admin_forbidden', message: 'Mata pelajaran bersama hanya dapat dihapus Admin.' }, 403);
    if ((await countProfilesForSubject(db, id)) > 0 || (await countAttemptsForSubject(db, id)) > 0) {
      return c.json({ error: 'in_use', message: 'Mata pelajaran sudah dipakai oleh profil atau riwayat ujian dan tidak dapat dihapus.' }, 409);
    }
    const deleted = await deleteSubjectWithContent(db, id);
    return c.json({ deleted: true, ...deleted });
  });

  return app;
}
