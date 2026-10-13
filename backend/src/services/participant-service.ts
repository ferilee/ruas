import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { participantProfiles } from '@/db/schema/participant-profiles';
import { assessmentTypes } from '@/db/schema/assessment-types';
import { educationClasses } from '@/db/schema/education-classes';
import { subjects } from '@/db/schema/subjects';
import { users } from '@/db/schema/users';
import type { Pool } from '@/db/connection';

type ParticipantDb = ReturnType<typeof drizzle>;

export function createParticipantDb(pool: Pool) {
  return drizzle(pool, { schema: { assessmentTypes, educationClasses, participantProfiles, subjects, users }, mode: 'default' });
}

export async function findParticipantProfile(db: ParticipantDb, identityKey: string) {
  const [[profile], [account]] = await Promise.all([
    db
      .select({
        participant_code: participantProfiles.participant_code,
        name: participantProfiles.name,
        gender: participantProfiles.gender,
        birth_date: participantProfiles.birth_date,
        subject_id: participantProfiles.subject_id,
        subject_label: subjects.label,
        access_token: participantProfiles.access_token,
        is_demo: participantProfiles.is_demo,
      })
      .from(participantProfiles)
      .leftJoin(subjects, eq(participantProfiles.subject_id, subjects.id))
      .where(eq(participantProfiles.identity_key, identityKey))
      .limit(1),
    db
      .select({ username: users.username, display_name: users.display_name, class_id: users.class_id, class_label: educationClasses.label, subject_id: users.subject_id, is_demo: users.is_demo })
      .from(users)
      .leftJoin(educationClasses, eq(users.class_id, educationClasses.id))
      .where(eq(users.username, identityKey))
      .limit(1),
  ]);

  if (!profile && !account) return null;

  const subjectId = account ? account.subject_id : profile?.subject_id ?? null;
  let subjectContext: { label: string; class_label: string; assessment_type_label: string } | null = null;
  if (subjectId) {
    const [subject] = await db
      .select({ label: subjects.label, class_label: educationClasses.label, assessment_type_label: assessmentTypes.label })
      .from(subjects)
      .leftJoin(educationClasses, eq(subjects.class_id, educationClasses.id))
      .leftJoin(assessmentTypes, eq(subjects.assessment_type_id, assessmentTypes.id))
      .where(eq(subjects.id, subjectId))
      .limit(1);
    subjectContext = subject
      ? { label: subject.label, class_label: subject.class_label ?? 'Semua kelas', assessment_type_label: subject.assessment_type_label ?? 'Semua jenis' }
      : null;
  }

  return {
    username: account?.username ?? identityKey,
    participant_code: account?.username ?? profile?.participant_code ?? identityKey,
    name: account?.display_name ?? profile?.name ?? '',
    gender: profile?.gender ?? '',
    birth_date: profile?.birth_date ?? '',
    subject_id: subjectId,
    subject_label: subjectContext?.label ?? profile?.subject_label ?? '',
    class_label: account?.class_label ?? subjectContext?.class_label ?? '',
    assessment_type_label: subjectContext?.assessment_type_label ?? '',
    access_token: profile?.access_token ?? '',
    is_demo: Boolean(account?.is_demo || profile?.is_demo),
    is_complete: Boolean(profile),
  };
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
    is_demo?: boolean;
  },
) {
  const existingId = await findParticipantId(db, identityKey);
  if (existingId) {
    await db.update(participantProfiles).set({ ...profile, is_demo: profile.is_demo ? 1 : 0, updated_at: new Date() }).where(eq(participantProfiles.id, existingId));
    return existingId;
  }

  const [result] = await db.insert(participantProfiles).values({ identity_key: identityKey, ...profile, is_demo: profile.is_demo ? 1 : 0 });
  return Number(result.insertId);
}
