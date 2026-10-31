import { beforeEach, describe, expect, it } from 'vitest';
import type { AdminReportRow } from '@/types';
import {
  latestReportTopicId,
  parseStoredReportContext,
  readStoredReportContext,
  reportContextStorageKey,
  resolveReportContext,
  storeReportContext,
} from '@/lib/report-context';

function row(attemptId: number, topicId: number | null, completedAt: string | null, startedAt = '2026-10-20T01:00:00Z'): AdminReportRow {
  return {
    attempt_id: attemptId,
    participant_id: 1,
    participant_code: 'P-1',
    participant_name: 'Siswa Satu',
    username: 'siswa.satu',
    subject_id: 7,
    subject_label: 'Matematika',
    class_id: 3,
    class_label: '11 TKJ A',
    assessment_type_id: null,
    assessment_type_label: null,
    topic_id: topicId,
    topic_label: topicId === null ? null : `Topik ${topicId}`,
    status: completedAt ? 'completed' : 'in_progress',
    total_questions: 10,
    answered_questions: 10,
    correct_count: 8,
    incorrect_count: 2,
    total_time_seconds: 600,
    accuracy: 80,
    violation_count: 0,
    integrity_penalty: 0,
    final_score: 80,
    started_at: startedAt,
    completed_at: completedAt,
  };
}

describe('report context storage key', () => {
  it('follows the per-user key pattern used by the question topic context', () => {
    expect(reportContextStorageKey('guru.satu')).toBe('ruas_teacher_report_context:guru.satu');
    expect(reportContextStorageKey('guru.satu')).toMatch(/^ruas_teacher_.+:.+/);
  });
});

describe('parseStoredReportContext', () => {
  it('parses a stored topic and class pair', () => {
    expect(parseStoredReportContext('{"topic_id":101,"class_id":3}')).toEqual({ topic_id: 101, class_id: 3 });
  });

  it('keeps a lone field and drops invalid fields one by one', () => {
    expect(parseStoredReportContext('{"topic_id":101}')).toEqual({ topic_id: 101 });
    expect(parseStoredReportContext('{"topic_id":"101","class_id":3}')).toEqual({ class_id: 3 });
    expect(parseStoredReportContext('{"topic_id":-4,"class_id":0}')).toEqual({});
  });

  it('treats unreadable records as absent', () => {
    expect(parseStoredReportContext(null)).toBeUndefined();
    expect(parseStoredReportContext('')).toBeUndefined();
    expect(parseStoredReportContext('bukan json')).toBeUndefined();
    expect(parseStoredReportContext('[1,2]')).toBeUndefined();
    expect(parseStoredReportContext('42')).toBeUndefined();
  });
});

describe('store and read report context', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips through localStorage under the per-user key', () => {
    storeReportContext('guru.satu', { topic_id: 101, class_id: 3 });
    expect(localStorage.getItem('ruas_teacher_report_context:guru.satu')).toBe('{"topic_id":101,"class_id":3}');
    expect(readStoredReportContext('guru.satu')).toEqual({ topic_id: 101, class_id: 3 });
    expect(readStoredReportContext('guru.lain')).toBeUndefined();
  });

  it('omits undefined fields instead of storing nulls', () => {
    storeReportContext('guru.satu', { topic_id: 102 });
    expect(localStorage.getItem('ruas_teacher_report_context:guru.satu')).toBe('{"topic_id":102}');
  });
});

describe('resolveReportContext', () => {
  const topics = [{ id: 101 }, { id: 102 }];
  const classes = [{ id: 3 }, { id: 4 }];

  it('keeps values that still exist in the loaded options', () => {
    expect(resolveReportContext({ topic_id: 101, class_id: 3 }, topics, classes)).toEqual({ topic_id: 101, class_id: 3 });
  });

  it('drops stale fields one by one instead of discarding the whole record', () => {
    expect(resolveReportContext({ topic_id: 999, class_id: 3 }, topics, classes)).toEqual({ class_id: 3 });
    expect(resolveReportContext({ topic_id: 101, class_id: 999 }, topics, classes)).toEqual({ topic_id: 101 });
    expect(resolveReportContext({ topic_id: 999, class_id: 999 }, topics, classes)).toEqual({});
  });

  it('returns an empty context when there is no record', () => {
    expect(resolveReportContext(undefined, topics, classes)).toEqual({});
  });
});

describe('latestReportTopicId', () => {
  it('picks the topic of the most recently completed result', () => {
    const rows = [
      row(1, 101, '2026-10-28T03:00:00Z'),
      row(2, 102, '2026-10-29T03:00:00Z'),
      row(3, 101, '2026-10-27T03:00:00Z'),
    ];
    expect(latestReportTopicId(rows)).toBe(102);
  });

  it('falls back to start time for unfinished rows and ignores topic-less rows', () => {
    const rows = [
      row(1, 101, '2026-10-28T03:00:00Z'),
      row(2, null, '2026-10-30T03:00:00Z'),
      row(3, 102, null, '2026-10-29T05:00:00Z'),
    ];
    expect(latestReportTopicId(rows)).toBe(102);
  });

  it('returns undefined when no row carries a topic', () => {
    expect(latestReportTopicId([])).toBeUndefined();
    expect(latestReportTopicId([row(1, null, '2026-10-29T03:00:00Z')])).toBeUndefined();
  });
});
