import { Hono } from 'hono';
import type { Pool } from '@/db/connection';
import {
  createAssessmentScheduleDb,
  getAssessmentScheduleStatusFromDb,
} from '@/services/assessment-schedule-service';

export function assessmentScheduleRoutes(pool: Pool) {
  const db = createAssessmentScheduleDb(pool);
  const app = new Hono();

  app.get('/', async (c) => {
    return c.json({ schedule: await getAssessmentScheduleStatusFromDb(db) });
  });

  return app;
}
