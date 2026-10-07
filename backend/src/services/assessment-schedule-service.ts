import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { assessmentSchedule } from '@/db/schema/assessment-schedule';
import type { Pool } from '@/db/connection';

export const ASSESSMENT_SCHEDULE_ID = 1;

type ScheduleDb = ReturnType<typeof drizzle>;

export interface AssessmentScheduleStatus {
  start_at: string | null;
  is_open: boolean;
  starts_in_seconds: number;
}

export function createAssessmentScheduleDb(pool: Pool) {
  return drizzle(pool, { schema: { assessmentSchedule }, mode: 'default' });
}

export async function findAssessmentSchedule(db: ScheduleDb) {
  const [row] = await db
    .select({ start_at: assessmentSchedule.start_at })
    .from(assessmentSchedule)
    .where(eq(assessmentSchedule.id, ASSESSMENT_SCHEDULE_ID))
    .limit(1);

  return row ?? null;
}

export function getAssessmentScheduleStatus(startAt: Date | null | undefined, now = new Date()): AssessmentScheduleStatus {
  if (!startAt) {
    return { start_at: null, is_open: true, starts_in_seconds: 0 };
  }

  const startsInSeconds = Math.max(0, Math.ceil((startAt.getTime() - now.getTime()) / 1000));
  return {
    start_at: startAt.toISOString(),
    is_open: startsInSeconds === 0,
    starts_in_seconds: startsInSeconds,
  };
}

export async function getAssessmentScheduleStatusFromDb(db: ScheduleDb, now = new Date()) {
  const schedule = await findAssessmentSchedule(db);
  return getAssessmentScheduleStatus(schedule?.start_at, now);
}
