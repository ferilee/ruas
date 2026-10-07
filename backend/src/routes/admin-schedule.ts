import { Hono } from 'hono';
import { z } from 'zod';
import { assessmentSchedule } from '@/db/schema/assessment-schedule';
import type { Pool } from '@/db/connection';
import {
  ASSESSMENT_SCHEDULE_ID,
  createAssessmentScheduleDb,
  getAssessmentScheduleStatusFromDb,
} from '@/services/assessment-schedule-service';

const updateScheduleSchema = z.object({
  start_at: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'start_at harus berupa tanggal yang valid.')
    .nullable(),
});

export function adminScheduleRoutes(pool: Pool) {
  const db = createAssessmentScheduleDb(pool);
  const app = new Hono();

  app.get('/', async (c) => {
    return c.json({ schedule: await getAssessmentScheduleStatusFromDb(db) });
  });

  app.put('/', async (c) => {
    const parsed = updateScheduleSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: 'invalid_body', message: 'Waktu mulai asesmen tidak valid.' }, 400);
    }

    const startAt = parsed.data.start_at ? new Date(parsed.data.start_at) : null;
    const now = new Date();

    await db
      .insert(assessmentSchedule)
      .values({ id: ASSESSMENT_SCHEDULE_ID, start_at: startAt, updated_at: now })
      .onDuplicateKeyUpdate({ set: { start_at: startAt, updated_at: now } });

    return c.json({ schedule: await getAssessmentScheduleStatusFromDb(db) });
  });

  return app;
}
