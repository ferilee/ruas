import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/mysql2';
import { topics } from '@/db/schema/topics';
import { matchesTopicToken } from '@/lib/topic-token';

type TopicAccessDb = ReturnType<typeof drizzle>;

export async function getTopicAccess(db: TopicAccessDb, topicId: number) {
  const [topic] = await db
    .select({ id: topics.id, requires_token: topics.requires_token, token_hash: topics.token_hash })
    .from(topics)
    .where(eq(topics.id, topicId))
    .limit(1);

  return topic ?? null;
}

export function canAccessTopic(topic: { requires_token: boolean; token_hash: string | null }, token?: string) {
  return !topic.requires_token || matchesTopicToken(topic.token_hash, token);
}

export async function verifyTopicAccess(db: TopicAccessDb, topicId: number, token?: string) {
  const topic = await getTopicAccess(db, topicId);
  if (!topic) return null;
  return canAccessTopic(topic, token);
}
