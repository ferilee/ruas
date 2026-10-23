import { and, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/mysql2';
import { assessmentSchedule } from '@/db/schema/assessment-schedule';
import { assessmentScheduleParticipants } from '@/db/schema/assessment-schedule-participants';
import { topics } from '@/db/schema/topics';
import { topicClasses } from '@/db/schema/topic-classes';
import { users } from '@/db/schema/users';
import { matchesTopicToken } from '@/lib/topic-token';

type TopicAccessDb = ReturnType<typeof drizzle>;

export function classIdsMatch(left: unknown, right: unknown) {
  const leftId = Number(left);
  const rightId = Number(right);
  return Number.isInteger(leftId) && Number.isInteger(rightId) && leftId > 0 && leftId === rightId;
}

async function findAccountClassId(db: TopicAccessDb, identityKey?: string | null) {
  if (!identityKey) return null;
  const [account] = await db
    .select({ class_id: users.class_id })
    .from(users)
    .where(eq(users.username, identityKey))
    .limit(1);
  return account?.class_id ?? null;
}

export async function canParticipantAccessTopic(db: TopicAccessDb, topicId: number, identityKey?: string | null, includeIndividualSchedule = false) {
  if (!includeIndividualSchedule) return canParticipantAccessByClass(db, topicId, identityKey);

  const [schedule] = await db
    .select({ id: assessmentSchedule.id, access_mode: assessmentSchedule.access_mode })
    .from(assessmentSchedule)
    .where(eq(assessmentSchedule.topic_id, topicId))
    .limit(1);

  if (schedule?.access_mode === 'individual') {
    if (!identityKey) return false;
    const [assignment] = await db
      .select({ user_id: assessmentScheduleParticipants.user_id })
      .from(assessmentScheduleParticipants)
      .innerJoin(users, eq(assessmentScheduleParticipants.user_id, users.id))
      .where(and(eq(assessmentScheduleParticipants.schedule_id, schedule.id), eq(users.username, identityKey)))
      .limit(1);
    return Boolean(assignment);
  }

  return canParticipantAccessByClass(db, topicId, identityKey);
}

async function canParticipantAccessByClass(db: TopicAccessDb, topicId: number, identityKey?: string | null) {
  const mappings = await db
    .select({ class_id: topicClasses.class_id })
    .from(topicClasses)
    .where(eq(topicClasses.topic_id, topicId));

  if (mappings.length === 0) return true;

  const classId = await findAccountClassId(db, identityKey);
  if (!identityKey) return true;
  if (classId === null) return false;
  return mappings.some((mapping) => classIdsMatch(mapping.class_id, classId));
}

export async function getParticipantClassId(db: TopicAccessDb, identityKey?: string | null) {
  return findAccountClassId(db, identityKey);
}

export async function listIndividualScheduleTopicIds(db: TopicAccessDb, identityKey?: string | null) {
  if (!identityKey) return [];
  const rows = await db
    .select({ topic_id: assessmentSchedule.topic_id })
    .from(assessmentSchedule)
    .innerJoin(assessmentScheduleParticipants, eq(assessmentScheduleParticipants.schedule_id, assessmentSchedule.id))
    .innerJoin(users, eq(assessmentScheduleParticipants.user_id, users.id))
    .where(and(eq(assessmentSchedule.access_mode, 'individual'), eq(users.username, identityKey)));
  return rows.map((row) => row.topic_id);
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
