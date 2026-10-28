import type { AdminSession } from './admin-auth-store';

interface ScopedUser {
  role: 'admin' | 'editor' | 'participant';
  is_demo: number | boolean;
  subject_id: number | null;
  class_id: number | null;
  created_by?: string | null;
}

// Daftar kelas efektif milik sesi guru. Relasi user_classes adalah sumber
// utama; sesi lama/akun lama tanpa relasi jatuh ke class_id tunggal.
// Daftar kosong berarti guru tidak dibatasi kelas (semua kelas dalam
// mapelnya), sama seperti class_id null pada model lama.
export function sessionClassIds(session: AdminSession | undefined): number[] {
  if (!session) return [];
  if (session.class_ids && session.class_ids.length > 0) return session.class_ids;
  return session.class_id !== null && session.class_id !== undefined ? [session.class_id] : [];
}

export function isAdmin(session: AdminSession | undefined) {
  return !session || session.role === 'admin';
}

export function topicMatchesAdminScope(
  session: AdminSession | undefined,
  topic: { subject_id: number; class_ids: number[]; created_by?: string | null; subject_created_by?: string | null; class_created_by?: Array<string | null> },
) {
  if (isAdmin(session)) return true;
  if (topic.created_by && topic.created_by !== session?.username && topic.created_by !== 'env-admin') return false;
  if (topic.created_by === session?.username || topic.subject_created_by === session?.username) return true;
  if (session?.subject_id !== topic.subject_id) return false;
  const classIds = sessionClassIds(session);
  if (classIds.length === 0 || topic.class_ids.length === 0) return true;
  return topic.class_ids.some((classId) => classIds.includes(classId)) || Boolean(topic.class_created_by?.includes(session.username));
}

export function topicInputMatchesAdminScope(
  session: AdminSession | undefined,
  input: { subject_id: number; class_ids: number[] },
) {
  if (isAdmin(session)) return true;
  if (session?.subject_id !== input.subject_id) return false;
  const classIds = sessionClassIds(session);
  if (classIds.length === 0 || input.class_ids.length === 0) return true;
  return input.class_ids.every((classId) => classIds.includes(classId));
}

export function rowMatchesAdminScope(
  session: AdminSession | undefined,
  row: { subject_id: number; class_id: number | null; subject_created_by?: string | null; class_created_by?: string | null; topic_created_by?: string | null; participant_created_by?: string | null },
) {
  if (isAdmin(session)) return true;
  if (row.subject_created_by === session?.username || row.class_created_by === session?.username || row.topic_created_by === session?.username || row.participant_created_by === session?.username) return true;
  if (session?.subject_id !== row.subject_id) return false;
  const classIds = sessionClassIds(session);
  return classIds.length === 0 || row.class_id === null || classIds.includes(row.class_id);
}

export function participantScopeForAdmin(session: AdminSession | undefined) {
  if (!session || session.role === 'admin' || session.subject_id === null) return null;
  return { subject_id: session.subject_id, class_ids: sessionClassIds(session) };
}

export function userMatchesAdminScope(session: AdminSession | undefined, user: ScopedUser) {
  if (isAdmin(session)) return true;
  if (user.created_by === session?.username) return true;
  const classIds = sessionClassIds(session);
  return Boolean(
    session &&
      session.subject_id !== null &&
      user.role === 'participant' &&
      !user.is_demo &&
      user.subject_id === session.subject_id &&
      (classIds.length === 0 || (user.class_id !== null && classIds.includes(user.class_id))),
  );
}
