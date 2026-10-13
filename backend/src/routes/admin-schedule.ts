import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { assessmentSchedule } from '@/db/schema/assessment-schedule';
import { topics } from '@/db/schema/topics';
import type { Pool } from '@/db/connection';
import {
  createAssessmentScheduleDb,
  listAssessmentSchedulesFromDb,
} from '@/services/assessment-schedule-service';

const updateScheduleSchema = z.object({
  start_at: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'start_at harus berupa tanggal yang valid.')
    .nullable(),
  end_at: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'end_at harus berupa tanggal yang valid.')
    .nullable(),
  enabled: z.boolean().default(true),
  notes: z.string().trim().max(255).nullable().default(null),
}).refine((value) => !value.start_at || !value.end_at || new Date(value.end_at).getTime() > new Date(value.start_at).getTime(), {
  path: ['end_at'],
  message: 'Waktu selesai harus setelah waktu mulai.',
});

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function adminScheduleRoutes(pool: Pool) {
  const db = createAssessmentScheduleDb(pool);
  const app = new Hono();

  app.get('/', async (c) => {
    return c.json({ schedules: await listAssessmentSchedulesFromDb(db) });
  });

  app.put('/:topicId', async (c) => {
    const topicId = parseId(c.req.param('topicId'));
    const parsed = updateScheduleSchema.safeParse(await c.req.json());
    if (!topicId || !parsed.success) return c.json({ error: 'invalid_body', message: 'Data jadwal asesmen tidak valid.' }, 400);
    const [topic] = await db.select({ id: topics.id }).from(topics).where(eq(topics.id, topicId)).limit(1);
    if (!topic) return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);

    const startAt = parsed.data.start_at ? new Date(parsed.data.start_at) : null;
    const endAt = parsed.data.end_at ? new Date(parsed.data.end_at) : null;

    await db
      .insert(assessmentSchedule)
      .values({ topic_id: topicId, start_at: startAt, end_at: endAt, enabled: parsed.data.enabled, notes: parsed.data.notes, updated_at: new Date() })
      .onDuplicateKeyUpdate({ set: { start_at: startAt, end_at: endAt, enabled: parsed.data.enabled, notes: parsed.data.notes, updated_at: new Date() } });

    const schedule = (await listAssessmentSchedulesFromDb(db)).find((item) => item.topic_id === topicId);
    return c.json({ schedule });
  });

  app.delete('/:topicId', async (c) => {
    const topicId = parseId(c.req.param('topicId'));
    if (!topicId) return c.json({ error: 'invalid_param', message: 'Topik tidak valid.' }, 400);
    await db.delete(assessmentSchedule).where(eq(assessmentSchedule.topic_id, topicId));
    return c.json({ deleted: true });
  });

  return app;
}
