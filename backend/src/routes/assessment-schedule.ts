import { Hono } from 'hono';
import { z } from 'zod';
import type { Pool } from '@/db/connection';
import {
  createAssessmentScheduleDb,
  getAssessmentScheduleStatusFromDb,
} from '@/services/assessment-schedule-service';

export function assessmentScheduleRoutes(pool: Pool) {
  const db = createAssessmentScheduleDb(pool);
  const app = new Hono();

  app.get('/', async (c) => {
    const subjectId = z.coerce.number().int().positive().optional().safeParse(c.req.query('subject_id'));
    return c.json({ schedule: await getAssessmentScheduleStatusFromDb(db, subjectId.success ? subjectId.data : undefined) });
  });

  return app;
}
