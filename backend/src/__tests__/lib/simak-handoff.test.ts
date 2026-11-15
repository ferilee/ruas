import { describe, expect, it } from 'vitest';
import {
  HANDOFF_TOKEN_TTL_MS,
  composeAssessmentStatus,
  createFailedAttemptLimiter,
  evaluateRedemption,
  firstFinishedPerUser,
  generateHandoffToken,
  handoffTargetPath,
  hashHandoffToken,
  secretsMatch,
  type HandoffTokenRow,
} from '@/lib/simak-handoff';

describe('simak handoff tokens', () => {
  it('generates url-safe tokens with at least 128 bits of entropy', () => {
    const token = generateHandoffToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    // base64url: 128 bit = 16 byte = 22 karakter; token kita 32 byte = 43 karakter.
    expect(token.length).toBeGreaterThanOrEqual(22);
    expect(generateHandoffToken()).not.toBe(token);
  });

  it('hashes tokens as deterministic sha256 hex', () => {
    const hash = hashHandoffToken('token-mentah');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashHandoffToken('token-mentah')).toBe(hash);
    expect(hashHandoffToken('token-lain')).not.toBe(hash);
    expect(hash).not.toContain('token-mentah');
  });

  it('matches secrets in constant time semantics', () => {
    expect(secretsMatch('rahasia-bersama', 'rahasia-bersama')).toBe(true);
    expect(secretsMatch('rahasia-bersama', 'rahasia-lain')).toBe(false);
    expect(secretsMatch('pendek', 'rahasia-yang-jauh-lebih-panjang')).toBe(false);
    expect(secretsMatch('', 'rahasia')).toBe(false);
  });

  it('keeps the handoff TTL at 60 seconds', () => {
    expect(HANDOFF_TOKEN_TTL_MS).toBe(60_000);
  });
});

describe('evaluateRedemption', () => {
  const now = new Date('2026-11-15T08:00:00.000Z');
  const baseRow: HandoffTokenRow = {
    username: 'siswa1',
    target_type: 'dashboard',
    target_topic_id: null,
    target_subject_id: null,
    expires_at: new Date(now.getTime() + 30_000),
    used_at: null,
  };

  it('rejects a missing token row', () => {
    expect(evaluateRedemption(null, now)).toEqual({ ok: false, reason: 'not_found' });
  });

  it('rejects an already used token (single use)', () => {
    const decision = evaluateRedemption({ ...baseRow, used_at: new Date(now.getTime() - 1_000) }, now);
    expect(decision).toEqual({ ok: false, reason: 'already_used' });
  });

  it('rejects an expired token', () => {
    const decision = evaluateRedemption({ ...baseRow, expires_at: new Date(now.getTime()) }, now);
    expect(decision).toEqual({ ok: false, reason: 'expired' });
  });

  it('accepts a fresh dashboard token', () => {
    expect(evaluateRedemption(baseRow, now)).toEqual({ ok: true, username: 'siswa1', target: { type: 'dashboard' } });
  });

  it('accepts a fresh topic token and carries its target', () => {
    const decision = evaluateRedemption({ ...baseRow, target_type: 'topic', target_topic_id: 7, target_subject_id: 3 }, now);
    expect(decision).toEqual({ ok: true, username: 'siswa1', target: { type: 'topic', topic_id: 7, subject_id: 3 } });
  });

  it('rejects a topic token without a topic id', () => {
    const decision = evaluateRedemption({ ...baseRow, target_type: 'topic', target_topic_id: null }, now);
    expect(decision).toEqual({ ok: false, reason: 'invalid_target' });
  });
});

describe('handoffTargetPath', () => {
  it('points dashboard targets at the RUAS home', () => {
    expect(handoffTargetPath({ type: 'dashboard' })).toBe('/');
  });

  it('points topic targets at the quiz page, with subject when known', () => {
    expect(handoffTargetPath({ type: 'topic', topic_id: 7 })).toBe('/quiz/7');
    expect(handoffTargetPath({ type: 'topic', topic_id: 7, subject_id: 3 })).toBe('/quiz/7?subject_id=3');
  });
});

describe('firstFinishedPerUser', () => {
  it('keeps the first row per user from latest-finished-first rows (not the best score)', () => {
    const rows = [
      { identity_key: 'siswa1', final_score: 70, completed_at: new Date('2026-11-14T10:00:00Z') },
      { identity_key: 'siswa2', final_score: 85, completed_at: new Date('2026-11-14T09:00:00Z') },
      { identity_key: 'siswa1', final_score: 95, completed_at: new Date('2026-11-13T10:00:00Z') },
    ];
    const picked = firstFinishedPerUser(rows);
    expect(picked.get('siswa1')?.final_score).toBe(70);
    expect(picked.get('siswa2')?.final_score).toBe(85);
    expect(picked.size).toBe(2);
  });
});

describe('composeAssessmentStatus', () => {
  it('reports finished with the latest completed attempt score', () => {
    const result = composeAssessmentStatus([
      { status: 'completed', final_score: 95, completed_at: new Date('2026-11-13T10:00:00Z') },
      { status: 'completed', final_score: 70, completed_at: new Date('2026-11-14T10:00:00Z') },
    ]);
    expect(result).toEqual({ status: 'finished', score: 70, finished_at: '2026-11-14T10:00:00.000Z' });
  });

  it('reports in_progress when an attempt is open and none finished', () => {
    const result = composeAssessmentStatus([{ status: 'in_progress', final_score: 0, completed_at: null }]);
    expect(result).toEqual({ status: 'in_progress', score: null, finished_at: null });
  });

  it('reports not_started for no attempts or only abandoned ones', () => {
    expect(composeAssessmentStatus([])).toEqual({ status: 'not_started', score: null, finished_at: null });
    expect(composeAssessmentStatus([{ status: 'abandoned', final_score: 0, completed_at: null }])).toEqual({
      status: 'not_started',
      score: null,
      finished_at: null,
    });
  });

  it('prefers finished over in_progress', () => {
    const result = composeAssessmentStatus([
      { status: 'in_progress', final_score: 0, completed_at: null },
      { status: 'completed', final_score: 60, completed_at: new Date('2026-11-14T10:00:00Z') },
    ]);
    expect(result.status).toBe('finished');
    expect(result.score).toBe(60);
  });
});

describe('createFailedAttemptLimiter', () => {
  it('blocks after the configured number of failures inside the window', () => {
    const limiter = createFailedAttemptLimiter({ maxFailures: 3, windowMs: 60_000 });
    const now = new Date('2026-11-15T08:00:00.000Z');
    expect(limiter.isBlocked('1.2.3.4', now)).toBe(false);
    limiter.recordFailure('1.2.3.4', now);
    limiter.recordFailure('1.2.3.4', now);
    expect(limiter.isBlocked('1.2.3.4', now)).toBe(false);
    limiter.recordFailure('1.2.3.4', now);
    expect(limiter.isBlocked('1.2.3.4', now)).toBe(true);
    expect(limiter.isBlocked('5.6.7.8', now)).toBe(false);
  });

  it('unblocks once the window has passed and after reset', () => {
    const limiter = createFailedAttemptLimiter({ maxFailures: 1, windowMs: 60_000 });
    const now = new Date('2026-11-15T08:00:00.000Z');
    limiter.recordFailure('1.2.3.4', now);
    expect(limiter.isBlocked('1.2.3.4', new Date(now.getTime() + 61_000))).toBe(false);
    limiter.recordFailure('1.2.3.4', now);
    limiter.reset('1.2.3.4');
    expect(limiter.isBlocked('1.2.3.4', now)).toBe(false);
  });
});
