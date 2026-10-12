import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { assessmentSchedule } from '@/db/schema/assessment-schedule';
import { assessmentTypes } from '@/db/schema/assessment-types';
import { subjects } from '@/db/schema/subjects';
import type { Pool } from '@/db/connection';

type ScheduleDb = ReturnType<typeof drizzle>;

export const ASSESSMENT_SCHEDULE_ID = 1;

export interface AssessmentScheduleStatus {
  assessment_type_id: number | null;
  assessment_type_label?: string | null;
  start_at: string | null;
  end_at: string | null;
  enabled: boolean;
  state: 'open' | 'upcoming' | 'ended' | 'disabled';
  is_open: boolean;
  starts_in_seconds: number;
}

export function createAssessmentScheduleDb(pool: Pool) {
  return drizzle(pool, { schema: { assessmentSchedule, assessmentTypes, subjects }, mode: 'default' });
}

export async function findAssessmentSchedule(db: ScheduleDb, assessmentTypeId: number) {
  const [row] = await db
    .select({ start_at: assessmentSchedule.start_at })
    .from(assessmentSchedule)
    .where(eq(assessmentSchedule.assessment_type_id, assessmentTypeId))
    .limit(1);

  return row ?? null;
}

export function getAssessmentScheduleStatus(
  startAt: Date | null | undefined,
  endAtOrNow: Date | null | undefined = null,
  enabledOrNow: boolean | Date = true,
  currentTime = new Date(),
): AssessmentScheduleStatus {
  const legacyCall = arguments.length === 2;
  let endAt: Date | null | undefined = endAtOrNow;
  let enabled = typeof enabledOrNow === 'boolean' ? enabledOrNow : true;
  let now = currentTime;
  if (legacyCall && endAtOrNow instanceof Date) {
    endAt = null;
    enabled = true;
    now = endAtOrNow;
  } else if (enabledOrNow instanceof Date) {
    now = enabledOrNow;
  }
  if (!startAt) {
    const isEnded = Boolean(endAt && endAt.getTime() <= now.getTime());
    const state: AssessmentScheduleStatus['state'] = !enabled ? 'disabled' : isEnded ? 'ended' : 'open';
    const status = { assessment_type_id: null, start_at: null, end_at: endAt?.toISOString() ?? null, enabled, state, is_open: state === 'open', starts_in_seconds: 0 };
    return legacyCall ? ({ start_at: null, is_open: status.is_open, starts_in_seconds: 0 } as AssessmentScheduleStatus) : status;
  }

  const startsInSeconds = Math.max(0, Math.ceil((startAt.getTime() - now.getTime()) / 1000));
  const isEnded = Boolean(endAt && endAt.getTime() <= now.getTime());
  const state: AssessmentScheduleStatus['state'] = !enabled ? 'disabled' : startsInSeconds > 0 ? 'upcoming' : isEnded ? 'ended' : 'open';
  const status = {
    assessment_type_id: null,
    start_at: startAt.toISOString(),
    end_at: endAt?.toISOString() ?? null,
    enabled,
    state,
    is_open: state === 'open',
    starts_in_seconds: startsInSeconds,
  };
  return legacyCall ? ({ start_at: status.start_at, is_open: status.is_open, starts_in_seconds: status.starts_in_seconds } as AssessmentScheduleStatus) : status;
}

export async function listAssessmentSchedulesFromDb(db: ScheduleDb, now = new Date()) {
  const rows = await db
    .select({
      id: assessmentSchedule.id,
      assessment_type_id: assessmentSchedule.assessment_type_id,
      assessment_type_label: assessmentTypes.label,
      start_at: assessmentSchedule.start_at,
      end_at: assessmentSchedule.end_at,
      enabled: assessmentSchedule.enabled,
      notes: assessmentSchedule.notes,
      updated_at: assessmentSchedule.updated_at,
    })
    .from(assessmentSchedule)
    .innerJoin(assessmentTypes, eq(assessmentSchedule.assessment_type_id, assessmentTypes.id));

  return rows.map((row) => ({
    ...row,
    ...getAssessmentScheduleStatus(row.start_at, row.end_at, Boolean(row.enabled), now),
    assessment_type_id: row.assessment_type_id,
    assessment_type_label: row.assessment_type_label,
    start_at: row.start_at?.toISOString() ?? null,
    end_at: row.end_at?.toISOString() ?? null,
  }));
}

export async function getAssessmentScheduleStatusFromDb(db: ScheduleDb, subjectId?: number, now = new Date()) {
  if (!subjectId) {
    const [schedule] = await db
      .select({ start_at: assessmentSchedule.start_at, end_at: assessmentSchedule.end_at, enabled: assessmentSchedule.enabled })
      .from(assessmentSchedule)
      .where(eq(assessmentSchedule.id, ASSESSMENT_SCHEDULE_ID))
      .limit(1);
    return getAssessmentScheduleStatus(schedule?.start_at, schedule?.end_at, schedule?.enabled === null || schedule?.enabled === undefined ? true : Boolean(schedule.enabled), now);
  }

  const [subject] = await db
    .select({ assessment_type_id: subjects.assessment_type_id, start_at: assessmentSchedule.start_at, end_at: assessmentSchedule.end_at, enabled: assessmentSchedule.enabled })
    .from(subjects)
    .leftJoin(assessmentSchedule, eq(assessmentSchedule.assessment_type_id, subjects.assessment_type_id))
    .where(eq(subjects.id, subjectId))
    .limit(1);
  if (!subject?.assessment_type_id) return getAssessmentScheduleStatus(null, null, true, now);

  const status = getAssessmentScheduleStatus(subject.start_at, subject.end_at, subject.enabled === null ? true : Boolean(subject.enabled), now);
  return { ...status, assessment_type_id: subject.assessment_type_id };
}
