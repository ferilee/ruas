import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq, count } from 'drizzle-orm';
import { topics } from '../db/schema/topics';
import { questions } from '../db/schema/questions';
import { educationClasses } from '../db/schema/education-classes';
import * as schema from '../db/schema/index';
import type { Pool } from '../db/connection';
import { z } from 'zod';
import { canAccessTopic, getTopicAccess } from '@/services/topic-access-service';

const querySchema = z.object({
  subject_id: z.coerce.number().int().positive(),
});
const tokenSchema = z.object({ token: z.string().trim().min(1).max(100) });

export function topicsRoutes(pool: Pool) {
  const db = drizzle(pool, { schema, mode: 'default' });
  const app = new Hono();

  app.get('/', async (c) => {
    const raw = c.req.query();
    const parsed = querySchema.safeParse(raw);

    if (!parsed.success) {
      return c.json({ error: 'invalid_query', message: 'subject_id harus berupa angka positif.' }, 400);
    }

    const rows = await db
      .select({
        id: topics.id,
        subject_id: topics.subject_id,
        class_id: educationClasses.id,
        class_label: educationClasses.label,
        slug: topics.slug,
        label: topics.label,
        display_order: topics.display_order,
        requires_token: topics.requires_token,
        question_count: count(questions.id),
      })
      .from(topics)
      .leftJoin(questions, eq(questions.topic_id, topics.id))
      .leftJoin(schema.subjects, eq(topics.subject_id, schema.subjects.id))
      .leftJoin(educationClasses, eq(educationClasses.id, schema.subjects.class_id))
      .where(eq(topics.subject_id, parsed.data.subject_id))
      .groupBy(topics.id)
      .orderBy(topics.display_order);

    return c.json({ topics: rows });
  });

  app.get('/:id', async (c) => {
    const id = Number(c.req.param('id'));

    if (!Number.isFinite(id) || id < 1) {
      return c.json({ error: 'invalid_param', message: 'ID topik tidak valid.' }, 400);
    }

    const [topic] = await db
      .select({
        id: topics.id,
        subject_id: topics.subject_id,
        class_id: educationClasses.id,
        class_label: educationClasses.label,
        slug: topics.slug,
        label: topics.label,
        display_order: topics.display_order,
        question_count: count(questions.id),
        requires_token: topics.requires_token,
      })
      .from(topics)
      .leftJoin(questions, eq(questions.topic_id, topics.id))
      .leftJoin(schema.subjects, eq(topics.subject_id, schema.subjects.id))
      .leftJoin(educationClasses, eq(educationClasses.id, schema.subjects.class_id))
      .where(eq(topics.id, id))
      .groupBy(topics.id)
      .limit(1);

    if (!topic) {
      return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
    }

    return c.json({ topic });
  });

  app.post('/:id/access', async (c) => {
    const id = Number(c.req.param('id'));
    const parsed = tokenSchema.safeParse(await c.req.json());
    if (!Number.isInteger(id) || id < 1 || !parsed.success) {
      return c.json({ error: 'invalid_body', message: 'Token topik tidak valid.' }, 400);
    }

    const topic = await getTopicAccess(db, id);
    if (!topic) return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
    if (!canAccessTopic(topic, parsed.data.token)) {
      return c.json({ error: 'invalid_topic_token', message: 'Token topik salah atau sudah tidak berlaku.' }, 403);
    }
    return c.json({ granted: true });
  });

  return app;
}
