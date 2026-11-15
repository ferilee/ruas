import { describe, expect, it, vi } from 'vitest';
import {
  getLatestFinishedScores,
  getStudentAssessments,
  hasCompletedAttempt,
  redeemHandoffToken,
} from '@/services/simak-internal-service';

// Db palsu berbentuk rantai drizzle: setiap metode mengembalikan rantai
// yang sama dan rantai itu sendiri thenable menuju baris hasil.
function chain(rows: unknown) {
  const node: Record<string, unknown> = {};
  for (const method of ['from', 'innerJoin', 'leftJoin', 'where', 'orderBy', 'limit', 'set', 'values']) {
    node[method] = () => node;
  }
  node.then = (resolve: (value: unknown) => void) => resolve(rows);
  return node;
}

function dbReturning(rows: unknown) {
  return { select: () => chain(rows) } as never;
}

describe('hasCompletedAttempt', () => {
  it('is true when a completed attempt row exists', async () => {
    await expect(hasCompletedAttempt(dbReturning([{ id: 11 }]), 'siswa1', 7, 3)).resolves.toBe(true);
  });

  it('is false when no completed attempt exists', async () => {
    await expect(hasCompletedAttempt(dbReturning([]), 'siswa1', 7, null)).resolves.toBe(false);
  });
});

describe('getLatestFinishedScores', () => {
  it('maps each username to its latest finished attempt, null when none', async () => {
    // Baris datang terurut dari attempt selesai paling akhir (sesuai ORDER BY layanan).
    const rows = [
      { identity_key: 'siswa1', final_score: 70, completed_at: new Date('2026-11-14T10:00:00Z') },
      { identity_key: 'siswa1', final_score: 95, completed_at: new Date('2026-11-13T10:00:00Z') },
    ];
    const scores = await getLatestFinishedScores(dbReturning(rows), 7, null, ['siswa1', 'siswa-asing']);
    expect(scores.get('siswa1')).toEqual({ score: 70, finished_at: '2026-11-14T10:00:00.000Z' });
    expect(scores.get('siswa-asing')).toBeNull();
  });

  it('returns an empty map for an empty username list without querying', async () => {
    const select = vi.fn(() => chain([]));
    const scores = await getLatestFinishedScores({ select } as never, 7, null, []);
    expect(scores.size).toBe(0);
    expect(select).not.toHaveBeenCalled();
  });
});

describe('getStudentAssessments', () => {
  it('skips unknown topics, keeps request order, and composes statuses', async () => {
    const topicRows = [{ id: 7, label: 'Eksponen' }, { id: 8, label: 'Logaritma' }];
    const attemptRows = [
      { topic_id: 7, subject_id: 3, status: 'completed', final_score: 88, completed_at: new Date('2026-11-14T10:00:00Z') },
      { topic_id: 8, subject_id: 3, status: 'in_progress', final_score: 0, completed_at: null },
    ];
    const queue = [topicRows, attemptRows];
    const db = { select: () => chain(queue.shift()) } as never;

    const result = await getStudentAssessments(db, 'siswa1', [
      { topic_id: 8, subject_id: 3 },
      { topic_id: 999 },
      { topic_id: 7, subject_id: 3 },
    ]);

    expect(result).toEqual([
      { topic_id: 8, title: 'Logaritma', status: 'in_progress', score: null, finished_at: null },
      { topic_id: 7, title: 'Eksponen', status: 'finished', score: 88, finished_at: '2026-11-14T10:00:00.000Z' },
    ]);
  });

  it('ignores attempts from another subject when subject_id is requested', async () => {
    const topicRows = [{ id: 7, label: 'Eksponen' }];
    const attemptRows = [
      { topic_id: 7, subject_id: 99, status: 'completed', final_score: 88, completed_at: new Date('2026-11-14T10:00:00Z') },
    ];
    const queue = [topicRows, attemptRows];
    const db = { select: () => chain(queue.shift()) } as never;

    const result = await getStudentAssessments(db, 'siswa1', [{ topic_id: 7, subject_id: 3 }]);
    expect(result).toEqual([{ topic_id: 7, title: 'Eksponen', status: 'not_started', score: null, finished_at: null }]);
  });
});

describe('redeemHandoffToken', () => {
  const now = new Date('2026-11-15T08:00:00.000Z');
  const freshRow = {
    id: 5,
    token_hash: 'hash',
    username: 'siswa1',
    target_type: 'topic',
    target_topic_id: 7,
    target_subject_id: 3,
    expires_at: new Date(now.getTime() + 30_000),
    used_at: null,
    created_at: now,
  };

  it('redeems a fresh token exactly once and returns username + target', async () => {
    const update = vi.fn(() => chain([{ affectedRows: 1 }]));
    const db = { select: () => chain([freshRow]), update } as never;
    await expect(redeemHandoffToken(db, 'hash', now)).resolves.toEqual({
      username: 'siswa1',
      target: { type: 'topic', topic_id: 7, subject_id: 3 },
    });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('fails when the atomic mark-used loses the race (affectedRows 0)', async () => {
    const db = { select: () => chain([freshRow]), update: () => chain([{ affectedRows: 0 }]) } as never;
    await expect(redeemHandoffToken(db, 'hash', now)).resolves.toBeNull();
  });

  it('rejects a used token without touching the update', async () => {
    const update = vi.fn(() => chain([{ affectedRows: 1 }]));
    const db = { select: () => chain([{ ...freshRow, used_at: new Date(now.getTime() - 1_000) }]), update } as never;
    await expect(redeemHandoffToken(db, 'hash', now)).resolves.toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects an expired token without touching the update', async () => {
    const update = vi.fn(() => chain([{ affectedRows: 1 }]));
    const db = { select: () => chain([{ ...freshRow, expires_at: new Date(now.getTime() - 1_000) }]), update } as never;
    await expect(redeemHandoffToken(db, 'hash', now)).resolves.toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects an unknown token hash', async () => {
    const db = { select: () => chain([]), update: () => chain([{ affectedRows: 1 }]) } as never;
    await expect(redeemHandoffToken(db, 'tidak-ada', now)).resolves.toBeNull();
  });
});
