import { asc, count, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { assessmentTypes } from '@/db/schema/assessment-types';
import { educationClasses } from '@/db/schema/education-classes';
import { examAttempts } from '@/db/schema/exam-attempts';
import { participantProfiles } from '@/db/schema/participant-profiles';
import { questionOptions } from '@/db/schema/question-options';
import { questions } from '@/db/schema/questions';
import { subjects } from '@/db/schema/subjects';
import { topics } from '@/db/schema/topics';
import { topicClasses } from '@/db/schema/topic-classes';
import type { Pool } from '@/db/connection';

type CurriculumDb = ReturnType<typeof drizzle>;

export function createCurriculumDb(pool: Pool) {
  return drizzle(pool, {
    schema: { assessmentTypes, educationClasses, examAttempts, participantProfiles, questionOptions, questions, subjects, topics, topicClasses },
    mode: 'default',
  });
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

export async function countTopicMappingsForClass(db: CurriculumDb, id: number) {
  const [row] = await db.select({ total: count() }).from(topicClasses).where(eq(topicClasses.class_id, id));
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

export async function countProfilesForSubject(db: CurriculumDb, id: number) {
  const [row] = await db.select({ total: count() }).from(participantProfiles).where(eq(participantProfiles.subject_id, id));
  return Number(row?.total ?? 0);
}

export async function countAttemptsForSubject(db: CurriculumDb, id: number) {
  const [row] = await db.select({ total: count() }).from(examAttempts).where(eq(examAttempts.subject_id, id));
  return Number(row?.total ?? 0);
}

export async function deleteSubjectWithContent(db: CurriculumDb, id: number) {
  const topicRows = await db.select({ id: topics.id }).from(topics).where(eq(topics.subject_id, id));
  const topicIds = topicRows.map((row) => row.id);
  const questionRows = topicIds.length
    ? await db.select({ id: questions.id }).from(questions).where(inArray(questions.topic_id, topicIds))
    : [];
  const questionIds = questionRows.map((row) => row.id);

  await db.transaction(async (tx) => {
    if (questionIds.length > 0) await tx.delete(questionOptions).where(inArray(questionOptions.question_id, questionIds));
    if (questionIds.length > 0) await tx.delete(questions).where(inArray(questions.id, questionIds));
    if (topicIds.length > 0) {
      await tx.delete(topicClasses).where(inArray(topicClasses.topic_id, topicIds));
      await tx.delete(topics).where(inArray(topics.id, topicIds));
    }
    await tx.delete(subjects).where(eq(subjects.id, id));
  });

  return { topic_count: topicIds.length, question_count: questionIds.length };
}
