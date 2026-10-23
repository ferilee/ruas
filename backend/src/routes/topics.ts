import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/mysql2';
import { and, countDistinct, eq, inArray, isNull, or } from 'drizzle-orm';
import { topics } from '../db/schema/topics';
import { questions } from '../db/schema/questions';
import { topicClasses } from '../db/schema/topic-classes';
import { topicQuestions } from '../db/schema/topic-questions';
import { educationClasses } from '../db/schema/education-classes';
import * as schema from '../db/schema/index';
import type { Pool } from '../db/connection';
import { z } from 'zod';
import { getParticipantClassId, canParticipantAccessTopic, canAccessTopic, getTopicAccess, listIndividualScheduleTopicIds } from '@/services/topic-access-service';
import { getParticipantIdentity } from '@/lib/participant-identity';

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

    const classId = await getParticipantClassId(db, getParticipantIdentity(c));
    const individualTopicIds = await listIndividualScheduleTopicIds(db, getParticipantIdentity(c));
    const conditions = [eq(topics.subject_id, parsed.data.subject_id)];
    if (classId !== null || individualTopicIds.length > 0) conditions.push(or(isNull(topicClasses.topic_id), classId !== null ? eq(topicClasses.class_id, classId) : undefined, individualTopicIds.length > 0 ? inArray(topics.id, individualTopicIds) : undefined)!);

    const rows = await db
      .select({
        id: topics.id,
        subject_id: topics.subject_id,
        class_id: topicClasses.class_id,
        class_label: educationClasses.label,
        slug: topics.slug,
        label: topics.label,
        display_order: topics.display_order,
        requires_token: topics.requires_token,
        question_count: countDistinct(questions.id),
      })
      .from(topics)
      .leftJoin(topicQuestions, and(eq(topicQuestions.topic_id, topics.id), eq(topicQuestions.enabled, true)))
      .leftJoin(questions, and(eq(questions.id, topicQuestions.question_id), isNull(questions.archived_at)))
      .leftJoin(topicClasses, eq(topicClasses.topic_id, topics.id))
      .leftJoin(educationClasses, eq(educationClasses.id, topicClasses.class_id))
      .where(and(...conditions))
      .groupBy(topics.id)
      .orderBy(topics.display_order);

    return c.json({ topics: rows });
  });

  app.get('/:id', async (c) => {
    const id = Number(c.req.param('id'));

    if (!Number.isFinite(id) || id < 1) {
      return c.json({ error: 'invalid_param', message: 'ID topik tidak valid.' }, 400);
    }
    const access = await getTopicAccess(db, id);
    if (!access) {
      return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
    }
    const classAccess = await canParticipantAccessTopic(db, id, getParticipantIdentity(c), true);
    const tokenAccess = access.requires_token && canAccessTopic(access, c.req.header('x-topic-access-token'));
    if (!classAccess && !tokenAccess) {
      if (access.requires_token) {
        return c.json({ error: 'topic_token_required', message: 'Masukkan token topik sebelum mengakses topik.' }, 403);
      }
      return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
    }

    const [topic] = await db
      .select({
        id: topics.id,
        subject_id: topics.subject_id,
        class_id: topicClasses.class_id,
        class_label: educationClasses.label,
        slug: topics.slug,
        label: topics.label,
        display_order: topics.display_order,
        question_count: countDistinct(questions.id),
        requires_token: topics.requires_token,
      })
      .from(topics)
      .leftJoin(topicQuestions, and(eq(topicQuestions.topic_id, topics.id), eq(topicQuestions.enabled, true)))
      .leftJoin(questions, and(eq(questions.id, topicQuestions.question_id), isNull(questions.archived_at)))
      .leftJoin(topicClasses, eq(topicClasses.topic_id, topics.id))
      .leftJoin(educationClasses, eq(educationClasses.id, topicClasses.class_id))
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
    const classAccess = await canParticipantAccessTopic(db, id, getParticipantIdentity(c), true);
    const tokenAccess = canAccessTopic(topic, parsed.data.token);
    if (!classAccess && !tokenAccess) {
      if (topic.requires_token) {
        return c.json({ error: 'invalid_topic_token', message: 'Token topik salah atau sudah tidak berlaku.' }, 403);
      }
      return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
    }
    if (!tokenAccess) {
      return c.json({ error: 'invalid_topic_token', message: 'Token topik salah atau sudah tidak berlaku.' }, 403);
    }
    return c.json({ granted: true });
  });

  return app;
}
