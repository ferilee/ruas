import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/mysql2';
import { topics } from '@/db/schema/topics';
import { topicClasses } from '@/db/schema/topic-classes';
import { users } from '@/db/schema/users';
import { matchesTopicToken } from '@/lib/topic-token';

type TopicAccessDb = ReturnType<typeof drizzle>;

async function findAccountClassId(db: TopicAccessDb, identityKey?: string | null) {
  if (!identityKey) return null;
  const [account] = await db
    .select({ class_id: users.class_id })
    .from(users)
    .where(eq(users.username, identityKey))
    .limit(1);
  return account?.class_id ?? null;
}

export async function canParticipantAccessTopic(db: TopicAccessDb, topicId: number, identityKey?: string | null) {
  const mappings = await db
    .select({ class_id: topicClasses.class_id })
    .from(topicClasses)
    .where(eq(topicClasses.topic_id, topicId));

  if (mappings.length === 0) return true;

  const classId = await findAccountClassId(db, identityKey);
  if (!identityKey) return true;
  if (classId === null) return false;
  return mappings.some((mapping) => mapping.class_id === classId);
}

export async function getParticipantClassId(db: TopicAccessDb, identityKey?: string | null) {
  return findAccountClassId(db, identityKey);
}

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
