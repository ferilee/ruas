import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { participantProfiles } from '@/db/schema/participant-profiles';
import { subjects } from '@/db/schema/subjects';
import type { Pool } from '@/db/connection';

type ParticipantDb = ReturnType<typeof drizzle>;

export function createParticipantDb(pool: Pool) {
  return drizzle(pool, { schema: { participantProfiles, subjects }, mode: 'default' });
}

export async function findParticipantProfile(db: ParticipantDb, identityKey: string) {
  const [profile] = await db
    .select({
      participant_code: participantProfiles.participant_code,
      name: participantProfiles.name,
      gender: participantProfiles.gender,
      birth_date: participantProfiles.birth_date,
      subject_id: participantProfiles.subject_id,
      subject_label: subjects.label,
      access_token: participantProfiles.access_token,
    })
    .from(participantProfiles)
    .leftJoin(subjects, eq(participantProfiles.subject_id, subjects.id))
    .where(eq(participantProfiles.identity_key, identityKey))
    .limit(1);

  return profile ? { ...profile, access_token: profile.access_token ?? '' } : null;
}

export async function findParticipantId(db: ParticipantDb, identityKey: string) {
  const [profile] = await db
    .select({ id: participantProfiles.id })
    .from(participantProfiles)
    .where(eq(participantProfiles.identity_key, identityKey))
    .limit(1);

  return profile?.id ?? null;
}

export async function saveParticipantProfile(
  db: ParticipantDb,
  identityKey: string,
  profile: {
    participant_code: string;
    name: string;
    gender: 'male' | 'female';
    birth_date: string;
    subject_id: number;
    access_token: string | null;
  },
) {
  const existingId = await findParticipantId(db, identityKey);
  if (existingId) {
    await db.update(participantProfiles).set({ ...profile, updated_at: new Date() }).where(eq(participantProfiles.id, existingId));
    return existingId;
  }

  const [result] = await db.insert(participantProfiles).values({ identity_key: identityKey, ...profile });
  return Number(result.insertId);
}
