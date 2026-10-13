import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { examAnswers } from '@/db/schema/exam-answers';
import { examAttempts } from '@/db/schema/exam-attempts';
import { examIntegrityEvents } from '@/db/schema/exam-integrity-events';
import { participantProfiles } from '@/db/schema/participant-profiles';
import { subjects } from '@/db/schema/subjects';
import { users } from '@/db/schema/users';
import type { Pool } from '@/db/connection';

type DemoDb = ReturnType<typeof drizzle>;

export function createDemoDb(pool: Pool) {
  return drizzle(pool, { schema: { examAnswers, examAttempts, examIntegrityEvents, participantProfiles, subjects, users }, mode: 'default' });
}

export async function prepareDemoSession(db: DemoDb, user: typeof users.$inferSelect) {
  const subjectId = user.subject_id;
  if (!subjectId) return false;

  await db.transaction(async (tx) => {
    const [profile] = await tx.select({ id: participantProfiles.id }).from(participantProfiles).where(eq(participantProfiles.identity_key, user.username)).limit(1);
    const participantId = profile?.id;

    if (participantId) {
      const attempts = await tx.select({ id: examAttempts.id }).from(examAttempts).where(eq(examAttempts.participant_id, participantId));
      const attemptIds = attempts.map((attempt) => attempt.id);
      if (attemptIds.length) {
        await tx.delete(examIntegrityEvents).where(inArray(examIntegrityEvents.attempt_id, attemptIds));
        await tx.delete(examAnswers).where(inArray(examAnswers.attempt_id, attemptIds));
        await tx.delete(examAttempts).where(inArray(examAttempts.id, attemptIds));
      }
      await tx.update(participantProfiles).set({
        participant_code: user.username,
        name: user.display_name,
        gender: 'male',
        birth_date: '2000-01-01',
        subject_id: subjectId,
        access_token: null,
        is_demo: 1,
        updated_at: new Date(),
      }).where(eq(participantProfiles.id, participantId));
      return;
    }

    await tx.insert(participantProfiles).values({
      identity_key: user.username,
      participant_code: user.username,
      name: user.display_name,
      gender: 'male',
      birth_date: '2000-01-01',
      subject_id: subjectId,
      access_token: null,
      is_demo: 1,
    });
  });

  return true;
}
