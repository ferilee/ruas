import { asc, count, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { assessmentTypes } from '@/db/schema/assessment-types';
import { educationClasses } from '@/db/schema/education-classes';
import { subjects } from '@/db/schema/subjects';
import { topics } from '@/db/schema/topics';
import type { Pool } from '@/db/connection';

type CurriculumDb = ReturnType<typeof drizzle>;

export function createCurriculumDb(pool: Pool) {
  return drizzle(pool, { schema: { assessmentTypes, educationClasses, subjects, topics }, mode: 'default' });
}

export async function listCurriculum(db: CurriculumDb) {
  const [classes, types, subjectRows] = await Promise.all([
    db.select().from(educationClasses).orderBy(asc(educationClasses.display_order), asc(educationClasses.id)),
    db.select().from(assessmentTypes).orderBy(asc(assessmentTypes.display_order), asc(assessmentTypes.id)),
    db.select().from(subjects).orderBy(asc(subjects.display_order), asc(subjects.id)),
  ]);

  return { classes, assessment_types: types, subjects: subjectRows };
}

export async function findClass(db: CurriculumDb, id: number) {
  const [row] = await db.select().from(educationClasses).where(eq(educationClasses.id, id)).limit(1);
  return row ?? null;
}

export async function findAssessmentType(db: CurriculumDb, id: number) {
  const [row] = await db.select().from(assessmentTypes).where(eq(assessmentTypes.id, id)).limit(1);
  return row ?? null;
}

export async function findSubject(db: CurriculumDb, id: number) {
  const [row] = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
  return row ?? null;
}

export async function countSubjectsForClass(db: CurriculumDb, id: number) {
  const [row] = await db.select({ total: count() }).from(subjects).where(eq(subjects.class_id, id));
  return Number(row?.total ?? 0);
}

export async function countSubjectsForAssessmentType(db: CurriculumDb, id: number) {
  const [row] = await db.select({ total: count() }).from(subjects).where(eq(subjects.assessment_type_id, id));
  return Number(row?.total ?? 0);
}

export async function countTopicsForSubject(db: CurriculumDb, id: number) {
  const [row] = await db.select({ total: count() }).from(topics).where(eq(topics.subject_id, id));
  return Number(row?.total ?? 0);
}
