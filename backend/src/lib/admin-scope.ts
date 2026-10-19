import type { AdminSession } from './admin-auth-store';

export function isAdmin(session: AdminSession | undefined) {
  return !session || session.role === 'admin';
}

export function topicMatchesAdminScope(
  session: AdminSession | undefined,
  topic: { subject_id: number; class_ids: number[] },
) {
  if (isAdmin(session)) return true;
  if (session?.subject_id !== topic.subject_id) return false;
  if (session.class_id === null || topic.class_ids.length === 0) return true;
  return topic.class_ids.includes(session.class_id);
}

export function topicInputMatchesAdminScope(
  session: AdminSession | undefined,
  input: { subject_id: number; class_ids: number[] },
) {
  if (isAdmin(session)) return true;
  if (session?.subject_id !== input.subject_id) return false;
  if (session.class_id === null || input.class_ids.length === 0) return true;
  return input.class_ids.every((classId) => classId === session.class_id);
}

export function rowMatchesAdminScope(
  session: AdminSession | undefined,
  row: { subject_id: number; class_id: number | null },
) {
  if (isAdmin(session)) return true;
  if (session?.subject_id !== row.subject_id) return false;
  return session.class_id === null || row.class_id === null || row.class_id === session.class_id;
}
