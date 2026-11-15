import { and, desc, eq, inArray, isNull, lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { examAttempts } from '@/db/schema/exam-attempts';
import { participantProfiles } from '@/db/schema/participant-profiles';
import { simakHandoffTokens } from '@/db/schema/simak-handoff-tokens';
import { subjects } from '@/db/schema/subjects';
import { topics } from '@/db/schema/topics';
import { users } from '@/db/schema/users';
import type { Pool } from '@/db/connection';
import {
  composeAssessmentStatus,
  evaluateRedemption,
  firstFinishedPerUser,
  toIsoString,
  type AssessmentStatus,
  type HandoffTarget,
} from '@/lib/simak-handoff';

// Lapisan basis data untuk endpoint internal SIMAK <-> RUAS (Hub Murid
// Tahap 2). Attempt murid ditemukan lewat participant_profiles.identity_key
// yang bernilai username akun RUAS — pola yang sama dengan exam-service.

export function createSimakInternalDb(pool: Pool) {
  return drizzle(pool, {
    schema: { examAttempts, participantProfiles, simakHandoffTokens, subjects, topics, users },
    mode: 'default',
  });
}

type SimakInternalDb = ReturnType<typeof createSimakInternalDb>;

export interface SimakTopic {
  id: number;
  title: string;
  subject_id: number;
  subject_name: string;
}

export interface StudentAssessment {
  topic_id: number;
  title: string;
  status: AssessmentStatus;
  score: number | null;
  finished_at: string | null;
}

function attemptConditions(username: string, topicId: number, subjectId?: number | null) {
  const conditions = [
    eq(participantProfiles.identity_key, username),
    eq(examAttempts.topic_id, topicId),
  ];
  if (subjectId != null) conditions.push(eq(examAttempts.subject_id, subjectId));
  return conditions;
}

export async function hasCompletedAttempt(
  db: SimakInternalDb,
  username: string,
  topicId: number,
  subjectId?: number | null,
): Promise<boolean> {
  const rows = await db
    .select({ id: examAttempts.id })
    .from(examAttempts)
    .innerJoin(participantProfiles, eq(examAttempts.participant_id, participantProfiles.id))
    .where(and(...attemptConditions(username, topicId, subjectId), eq(examAttempts.status, 'completed')))
    .limit(1);
  return rows.length > 0;
}

// Skor attempt SELESAI TERAKHIR per username (bukan skor terbaik).
// Username tanpa attempt selesai pada topik itu bernilai null.
export async function getLatestFinishedScores(
  db: SimakInternalDb,
  topicId: number,
  subjectId: number | null,
  usernames: string[],
): Promise<Map<string, { score: number; finished_at: string | null } | null>> {
  const result = new Map<string, { score: number; finished_at: string | null } | null>();
  for (const username of usernames) result.set(username, null);
  if (usernames.length === 0) return result;

  const conditions = [
    inArray(participantProfiles.identity_key, usernames),
    eq(examAttempts.topic_id, topicId),
    eq(examAttempts.status, 'completed'),
  ];
  if (subjectId != null) conditions.push(eq(examAttempts.subject_id, subjectId));

  const rows = await db
    .select({
      identity_key: participantProfiles.identity_key,
      final_score: examAttempts.final_score,
      completed_at: examAttempts.completed_at,
    })
    .from(examAttempts)
    .innerJoin(participantProfiles, eq(examAttempts.participant_id, participantProfiles.id))
    .where(and(...conditions))
    .orderBy(desc(examAttempts.completed_at), desc(examAttempts.id));

  for (const [username, row] of firstFinishedPerUser(rows)) {
    result.set(username, { score: row.final_score, finished_at: toIsoString(row.completed_at) });
  }
  return result;
}

// Status asesmen satu murid untuk daftar topik yang diminta SIMAK.
// Topik yang tidak dikenal RUAS dilewati dari hasil (SIMAK mengetahuinya
// dari ketiadaan entri), urutan hasil mengikuti urutan permintaan.
export async function getStudentAssessments(
  db: SimakInternalDb,
  username: string,
  requested: { topic_id: number; subject_id?: number | null }[],
): Promise<StudentAssessment[]> {
  if (requested.length === 0) return [];

  const topicIds = [...new Set(requested.map((entry) => entry.topic_id))];
  const topicRows = await db
    .select({ id: topics.id, label: topics.label })
    .from(topics)
    .where(inArray(topics.id, topicIds));
  const topicById = new Map(topicRows.map((row) => [row.id, row]));

  const attemptRows = await db
    .select({
      topic_id: examAttempts.topic_id,
      subject_id: examAttempts.subject_id,
      status: examAttempts.status,
      final_score: examAttempts.final_score,
      completed_at: examAttempts.completed_at,
    })
    .from(examAttempts)
    .innerJoin(participantProfiles, eq(examAttempts.participant_id, participantProfiles.id))
    .where(and(eq(participantProfiles.identity_key, username), inArray(examAttempts.topic_id, topicIds)));

  const assessments: StudentAssessment[] = [];
  for (const entry of requested) {
    const topic = topicById.get(entry.topic_id);
    if (!topic) continue;
    const own = attemptRows.filter(
      (row) => row.topic_id === entry.topic_id && (entry.subject_id == null || row.subject_id === entry.subject_id),
    );
    const composed = composeAssessmentStatus(own);
    assessments.push({ topic_id: topic.id, title: topic.label, ...composed });
  }
  return assessments;
}

// Topik untuk pemilih guru di SIMAK. Tabel topics tidak memiliki keadaan
// terarsip di RUAS, jadi seluruh topik dikembalikan beserta mapelnya.
export async function listSimakTopics(db: SimakInternalDb): Promise<SimakTopic[]> {
  const rows = await db
    .select({
      id: topics.id,
      title: topics.label,
      subject_id: topics.subject_id,
      subject_name: subjects.label,
    })
    .from(topics)
    .innerJoin(subjects, eq(topics.subject_id, subjects.id))
    .orderBy(subjects.display_order, topics.display_order);
  return rows;
}

export async function findActiveUser(db: SimakInternalDb, username: string) {
  const [user] = await db
    .select({ username: users.username, is_demo: users.is_demo })
    .from(users)
    .where(and(eq(users.username, username), eq(users.active, 1)))
    .limit(1);
  return user ?? null;
}

export async function findTopic(db: SimakInternalDb, topicId: number) {
  const [topic] = await db.select({ id: topics.id }).from(topics).where(eq(topics.id, topicId)).limit(1);
  return topic ?? null;
}

export async function storeHandoffToken(
  db: SimakInternalDb,
  input: { tokenHash: string; username: string; target: HandoffTarget; expiresAt: Date },
): Promise<void> {
  // Sapu token lama yang sudah kedaluwarsa agar tabel tidak menumpuk.
  await db.delete(simakHandoffTokens).where(lt(simakHandoffTokens.expires_at, new Date()));
  await db.insert(simakHandoffTokens).values({
    token_hash: input.tokenHash,
    username: input.username,
    target_type: input.target.type,
    target_topic_id: input.target.type === 'topic' ? input.target.topic_id : null,
    target_subject_id: input.target.type === 'topic' ? (input.target.subject_id ?? null) : null,
    expires_at: input.expiresAt,
  });
}

// Tukar token serah-terima: sah tepat satu kali. Baris ditandai terpakai
// dengan UPDATE yang dijaga used_at IS NULL; bila balapan dan baris sudah
// ditandai pemanggil lain, penukaran ini gagal.
export async function redeemHandoffToken(
  db: SimakInternalDb,
  tokenHash: string,
  now: Date = new Date(),
): Promise<{ username: string; target: HandoffTarget } | null> {
  const [row] = await db
    .select()
    .from(simakHandoffTokens)
    .where(eq(simakHandoffTokens.token_hash, tokenHash))
    .limit(1);

  const decision = evaluateRedemption(row, now);
  if (!decision.ok || !row) return null;

  const result = await db
    .update(simakHandoffTokens)
    .set({ used_at: now })
    .where(and(eq(simakHandoffTokens.id, row.id), isNull(simakHandoffTokens.used_at)));
  const header = (Array.isArray(result) ? result[0] : result) as { affectedRows?: number } | undefined;
  if (!header || header.affectedRows !== 1) return null;

  return { username: decision.username, target: decision.target };
}
