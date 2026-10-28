import { describe, expect, it } from 'vitest';
import { findParticipantProfile } from '@/services/participant-service';

type ParticipantDb = Parameters<typeof findParticipantProfile>[0];

// findParticipantProfile hanya memakai rantai select().from().leftJoin()
// .where().limit(1) yang di-await — fake ini mengembalikan baris antrean
// per pemanggilan select(), sesuai urutan query di layanannya.
function createFakeDb(resultQueue: unknown[][]) {
  const queue = [...resultQueue];
  const createChain = () => {
    const rows = queue.shift() ?? [];
    const chain: Record<string, unknown> = {};
    for (const method of ['from', 'leftJoin', 'where', 'limit']) {
      chain[method] = () => chain;
    }
    chain.then = (resolve: (value: unknown) => void) => resolve(rows);
    return chain;
  };
  return { select: () => createChain() } as unknown as ParticipantDb;
}

const accountRow = (overrides: Record<string, unknown> = {}) => ({
  username: 'guru1',
  display_name: 'Guru Satu',
  role: 'editor',
  class_id: null,
  class_label: null,
  subject_id: null,
  is_demo: 0,
  ...overrides,
});

describe('findParticipantProfile account_role (RUAS-004)', () => {
  it('exposes the database account role for editor accounts', async () => {
    const db = createFakeDb([[], [accountRow()]]);

    const profile = await findParticipantProfile(db, 'guru1');

    expect(profile?.name).toBe('Guru Satu');
    expect(profile?.account_role).toBe('editor');
  });

  it('exposes participant for student accounts and admin for admin accounts', async () => {
    const participantDb = createFakeDb([[], [accountRow({ username: 'siswa1', display_name: 'Siswa Satu', role: 'participant' })]]);
    expect((await findParticipantProfile(participantDb, 'siswa1'))?.account_role).toBe('participant');

    const adminDb = createFakeDb([[], [accountRow({ username: 'admin1', display_name: 'Admin Satu', role: 'admin' })]]);
    expect((await findParticipantProfile(adminDb, 'admin1'))?.account_role).toBe('admin');
  });

  it('returns null account_role when only a participant profile exists', async () => {
    const profileRow = { participant_code: 'X1', name: 'Siswa Lepas', gender: '', birth_date: '', subject_id: null, subject_label: null, is_demo: 0 };
    const db = createFakeDb([[profileRow], []]);

    const profile = await findParticipantProfile(db, 'anon-key');

    expect(profile?.name).toBe('Siswa Lepas');
    expect(profile?.account_role).toBeNull();
  });
});
