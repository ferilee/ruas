import type { AdminSession } from './admin-auth-store';

interface ScopedUser {
  role: 'admin' | 'editor' | 'participant';
  is_demo: number | boolean;
  subject_id: number | null;
  class_id: number | null;
}

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

export function participantScopeForAdmin(session: AdminSession | undefined) {
  if (!session || session.role === 'admin' || session.subject_id === null) return null;
  return { subject_id: session.subject_id, class_id: session.class_id };
}

export function userMatchesAdminScope(session: AdminSession | undefined, user: ScopedUser) {
  if (isAdmin(session)) return true;
  return Boolean(
    session &&
      session.subject_id !== null &&
      user.role === 'participant' &&
      !user.is_demo &&
      user.subject_id === session.subject_id &&
      (session.class_id === null || user.class_id === session.class_id),
  );
}
