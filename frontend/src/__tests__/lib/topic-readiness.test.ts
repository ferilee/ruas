import { describe, expect, it } from 'vitest';
import { getTopicReadiness } from '@/lib/topic-readiness';

describe('getTopicReadiness (RUAS-003)', () => {
  it('flags topics without questions first', () => {
    const readiness = getTopicReadiness({ questionCount: 0, hasSchedule: true, tokenConfigured: true });
    expect(readiness.status).toBe('no-questions');
    expect(readiness.nextStep).toContain('Tambah soal');
    expect(readiness.isReady).toBe(false);
  });

  it('flags topics with questions but no schedule', () => {
    const readiness = getTopicReadiness({ questionCount: 5, hasSchedule: false, tokenConfigured: true });
    expect(readiness.status).toBe('unscheduled');
    expect(readiness.nextStep).toContain('Atur jadwal');
  });

  it('flags scheduled topics without a token', () => {
    const readiness = getTopicReadiness({ questionCount: 5, hasSchedule: true, tokenConfigured: false });
    expect(readiness.status).toBe('no-token');
  });

  it('marks complete topics as ready', () => {
    const readiness = getTopicReadiness({ questionCount: 5, hasSchedule: true, tokenConfigured: true });
    expect(readiness.status).toBe('ready');
    expect(readiness.isReady).toBe(true);
  });
});
