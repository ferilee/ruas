import { describe, expect, it } from 'vitest';
import {
  participantScopeForAdmin,
  rowMatchesAdminScope,
  sessionClassIds,
  topicInputMatchesAdminScope,
  topicMatchesAdminScope,
  userMatchesAdminScope,
} from '@/lib/admin-scope';
import type { AdminSession } from '@/lib/admin-auth-store';

function editorSession(classIds: number[], legacyClassId: number | null = null): AdminSession {
  return { username: 'guru', display_name: 'Guru', role: 'editor', subject_id: 7, class_id: legacyClassId, class_ids: classIds };
}

describe('sessionClassIds', () => {
  it('prefers the mapped class list over the legacy single class', () => {
    expect(sessionClassIds(editorSession([2, 3], 2))).toEqual([2, 3]);
  });

  it('falls back to the legacy single class when no mapping exists', () => {
    expect(sessionClassIds(editorSession([], 5))).toEqual([5]);
  });

  it('returns an empty list for an unrestricted teacher', () => {
    expect(sessionClassIds(editorSession([], null))).toEqual([]);
  });
});

describe('topicMatchesAdminScope with multiple classes', () => {
  const topic = (classIds: number[], subjectId = 7) => ({ subject_id: subjectId, class_ids: classIds });

  it('matches a topic targeted at any of the teacher classes', () => {
    expect(topicMatchesAdminScope(editorSession([2, 3, 4]), topic([4]))).toBe(true);
    expect(topicMatchesAdminScope(editorSession([2, 3, 4]), topic([2, 9]))).toBe(true);
  });

  it('hides a topic targeted only at unmapped classes', () => {
    expect(topicMatchesAdminScope(editorSession([2, 3, 4]), topic([9]))).toBe(false);
  });

  it('matches topics for all classes and teachers without restriction', () => {
    expect(topicMatchesAdminScope(editorSession([2, 3, 4]), topic([]))).toBe(true);
    expect(topicMatchesAdminScope(editorSession([]), topic([9]))).toBe(true);
  });

  it('keeps the single-class behaviour for a teacher with one class', () => {
    expect(topicMatchesAdminScope(editorSession([3]), topic([3]))).toBe(true);
    expect(topicMatchesAdminScope(editorSession([3]), topic([4]))).toBe(false);
  });

  it('still requires the same subject', () => {
    expect(topicMatchesAdminScope(editorSession([2, 3, 4]), topic([3], 8))).toBe(false);
  });
});

describe('topicInputMatchesAdminScope with multiple classes', () => {
  it('allows input fully inside the mapped classes', () => {
    expect(topicInputMatchesAdminScope(editorSession([2, 3, 4]), { subject_id: 7, class_ids: [2, 4] })).toBe(true);
  });

  it('rejects input containing an unmapped class', () => {
    expect(topicInputMatchesAdminScope(editorSession([2, 3, 4]), { subject_id: 7, class_ids: [2, 9] })).toBe(false);
  });

  it('allows all-class input and unrestricted teachers', () => {
    expect(topicInputMatchesAdminScope(editorSession([2, 3, 4]), { subject_id: 7, class_ids: [] })).toBe(true);
    expect(topicInputMatchesAdminScope(editorSession([]), { subject_id: 7, class_ids: [9] })).toBe(true);
  });
});

describe('rowMatchesAdminScope with multiple classes', () => {
  const row = (classId: number | null, subjectId = 7) => ({ subject_id: subjectId, class_id: classId });

  it('matches rows from any mapped class and class-less rows', () => {
    expect(rowMatchesAdminScope(editorSession([2, 3, 4]), row(4))).toBe(true);
    expect(rowMatchesAdminScope(editorSession([2, 3, 4]), row(null))).toBe(true);
  });

  it('hides rows from unmapped classes', () => {
    expect(rowMatchesAdminScope(editorSession([2, 3, 4]), row(9))).toBe(false);
  });
});

describe('userMatchesAdminScope with multiple classes', () => {
  const participant = (classId: number | null) => ({ role: 'participant' as const, is_demo: 0, subject_id: 7, class_id: classId, created_by: null });

  it('matches participants in any mapped class', () => {
    expect(userMatchesAdminScope(editorSession([2, 3, 4]), participant(3))).toBe(true);
    expect(userMatchesAdminScope(editorSession([2, 3, 4]), participant(9))).toBe(false);
  });

  it('keeps legacy semantics for unassigned participants and unrestricted teachers', () => {
    expect(userMatchesAdminScope(editorSession([2, 3, 4]), participant(null))).toBe(false);
    expect(userMatchesAdminScope(editorSession([]), participant(9))).toBe(true);
  });
});

describe('participantScopeForAdmin with multiple classes', () => {
  it('returns the full mapped class list', () => {
    expect(participantScopeForAdmin(editorSession([2, 3, 4]))).toEqual({ subject_id: 7, class_ids: [2, 3, 4] });
  });

  it('returns null for admin sessions', () => {
    const admin: AdminSession = { username: 'admin', display_name: 'Admin', role: 'admin', subject_id: null, class_id: null, class_ids: [] };
    expect(participantScopeForAdmin(admin)).toBeNull();
  });
});
