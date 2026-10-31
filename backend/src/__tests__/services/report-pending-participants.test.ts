import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assessmentSchedule } from '@/db/schema/assessment-schedule';
import { assessmentScheduleParticipants } from '@/db/schema/assessment-schedule-participants';
import { educationClasses } from '@/db/schema/education-classes';
import { examAttempts } from '@/db/schema/exam-attempts';
import { subjects } from '@/db/schema/subjects';
import { topicClasses } from '@/db/schema/topic-classes';
import { topics } from '@/db/schema/topics';
import { users } from '@/db/schema/users';

const { drizzleMock } = vi.hoisted(() => ({
  drizzleMock: vi.fn(),
}));

vi.mock('drizzle-orm/mysql2', () => ({
  drizzle: drizzleMock,
}));

// Fake DB mengikuti pola admin-my-classes.test.ts: rantai select cukup
// menjawab berdasarkan tabel asal (from), kondisi where diabaikan karena
// penyaringan sesungguhnya terjadi di computePendingParticipants.
function selectChain(rows: unknown[]) {
  const resolved = Promise.resolve(rows);
  const chain: Record<string, unknown> = {
    where: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    orderBy: () => chain,
    then: resolved.then.bind(resolved),
    catch: resolved.catch.bind(resolved),
  };
  return chain;
}

function createFakeDb(rowsByTable: Map<unknown, unknown[]>) {
  return {
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => selectChain(rowsByTable.get(table) ?? [])),
    })),
  };
}

const baseRows = new Map<unknown, unknown[]>([
  [topics, [{ subject_id: 7, created_by: 'env-admin' }]],
  [subjects, [{ created_by: 'env-admin', class_id: 1 }]],
  [topicClasses, [{ class_id: 1 }]],
  [educationClasses, [
    { id: 1, label: 'Kelas 10', created_by: 'env-admin' },
    { id: 2, label: 'Kelas 11', created_by: 'env-admin' },
  ]],
  [users, [
    { id: 1, username: 'siswa1', display_name: 'Siswa Satu', class_id: 1, role: 'participant', active: 1, is_demo: 0, created_by: null },
    { id: 2, username: 'siswa2', display_name: 'Siswa Dua', class_id: 2, role: 'participant', active: 1, is_demo: 0, created_by: null },
  ]],
  [examAttempts, []],
  [assessmentSchedule, []],
  [assessmentScheduleParticipants, []],
]);

describe('listPendingParticipants (pengkabelan DB)', () => {
  beforeEach(() => {
    drizzleMock.mockReset();
  });

  it('returns an empty list without querying when no topic is selected', async () => {
    const db = createFakeDb(baseRows);
    drizzleMock.mockReturnValue(db);
    const { createReportDb, listPendingParticipants } = await import('@/services/report-service');

    await expect(listPendingParticipants(createReportDb({} as never), { status: 'completed' })).resolves.toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });

  it('class schedule: expected roster comes from topic classes and attempts decide the state', async () => {
    const rows = new Map(baseRows);
    rows.set(assessmentSchedule, [{ id: 5, access_mode: 'class' }]);
    rows.set(examAttempts, [
      { username: 'siswa1', status: 'in_progress', is_demo: 0 },
    ]);
    drizzleMock.mockReturnValue(createFakeDb(rows));
    const { createReportDb, listPendingParticipants } = await import('@/services/report-service');

    const result = await listPendingParticipants(createReportDb({} as never), { status: 'completed', topic_id: 10 });
    // Topik hanya terikat ke kelas 1, jadi siswa kelas 2 bukan peserta harapan.
    expect(result).toEqual([
      expect.objectContaining({ participant_id: 1, participant_name: 'Siswa Satu', class_label: 'Kelas 10', state: 'in_progress' }),
    ]);
  });

  it('individual schedule: expected set is the explicit participant list, even outside topic classes', async () => {
    const rows = new Map(baseRows);
    rows.set(assessmentSchedule, [{ id: 5, access_mode: 'individual' }]);
    rows.set(assessmentScheduleParticipants, [{ user_id: 2 }]);
    rows.set(examAttempts, [
      { username: 'siswa2', status: 'abandoned', is_demo: 0 },
    ]);
    drizzleMock.mockReturnValue(createFakeDb(rows));
    const { createReportDb, listPendingParticipants } = await import('@/services/report-service');

    const result = await listPendingParticipants(createReportDb({} as never), { status: 'completed', topic_id: 10 });
    expect(result).toEqual([
      expect.objectContaining({ participant_id: 2, participant_name: 'Siswa Dua', state: 'not_started' }),
    ]);
  });

  it('unknown topic yields an empty list', async () => {
    const rows = new Map(baseRows);
    rows.set(topics, []);
    drizzleMock.mockReturnValue(createFakeDb(rows));
    const { createReportDb, listPendingParticipants } = await import('@/services/report-service');

    await expect(listPendingParticipants(createReportDb({} as never), { status: 'completed', topic_id: 99 })).resolves.toEqual([]);
  });
});
