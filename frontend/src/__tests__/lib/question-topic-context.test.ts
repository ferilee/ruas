import { beforeEach, describe, expect, it } from 'vitest';
import type { AdminTopic } from '@/types';
import {
  groupQuestionTopicsBySubject,
  parseStoredQuestionTopic,
  questionTopicStorageKey,
  readStoredQuestionTopic,
  resolveQuestionTopicFilter,
  storeQuestionTopic,
} from '@/lib/question-topic-context';

function topic(id: number, subjectId: number, subjectLabel: string, label: string): AdminTopic {
  return {
    id,
    subject_id: subjectId,
    subject_label: subjectLabel,
    class_ids: [],
    class_labels: [],
    slug: label.toLowerCase().replaceAll(' ', '-'),
    label,
    display_order: id,
    requires_token: false,
    token_configured: false,
    question_count: id,
  };
}

const topics: AdminTopic[] = [
  topic(101, 7, 'Matematika', 'Aljabar Dasar'),
  topic(103, 8, 'Informatika', 'Algoritma'),
  topic(102, 7, 'Matematika', 'Geometri Ruang'),
];

describe('question topic storage key', () => {
  it('follows the per-user key pattern used by the onboarding wizard', () => {
    expect(questionTopicStorageKey('guru.satu')).toBe('ruas_teacher_question_topic:guru.satu');
    expect(questionTopicStorageKey('guru.satu')).toMatch(/^ruas_teacher_.+:.+/);
  });
});

describe('parseStoredQuestionTopic', () => {
  it('treats "all" as the legitimate Semua topik choice', () => {
    expect(parseStoredQuestionTopic('all')).toBeNull();
  });

  it('parses a positive integer id', () => {
    expect(parseStoredQuestionTopic('101')).toBe(101);
  });

  it('treats missing or corrupt records as no record', () => {
    expect(parseStoredQuestionTopic(null)).toBeUndefined();
    expect(parseStoredQuestionTopic('')).toBeUndefined();
    expect(parseStoredQuestionTopic('bukan-angka')).toBeUndefined();
    expect(parseStoredQuestionTopic('0')).toBeUndefined();
    expect(parseStoredQuestionTopic('-3')).toBeUndefined();
    expect(parseStoredQuestionTopic('10.5')).toBeUndefined();
  });
});

describe('store and read round trip', () => {
  beforeEach(() => localStorage.clear());

  it('remembers a chosen topic per user', () => {
    storeQuestionTopic('guru.satu', 102);
    expect(localStorage.getItem(questionTopicStorageKey('guru.satu'))).toBe('102');
    expect(readStoredQuestionTopic('guru.satu')).toBe(102);
    expect(readStoredQuestionTopic('guru.lain')).toBeUndefined();
  });

  it('remembers the Semua topik choice as a legitimate value', () => {
    storeQuestionTopic('guru.satu', null);
    expect(localStorage.getItem(questionTopicStorageKey('guru.satu'))).toBe('all');
    expect(readStoredQuestionTopic('guru.satu')).toBeNull();
  });
});

describe('resolveQuestionTopicFilter', () => {
  it('restores the remembered topic while it still exists', () => {
    expect(resolveQuestionTopicFilter(103, topics)).toBe(103);
  });

  it('falls back to Semua topik when the remembered topic is gone', () => {
    expect(resolveQuestionTopicFilter(999, topics)).toBeNull();
  });

  it('keeps Semua topik for the stored all choice and for no record', () => {
    expect(resolveQuestionTopicFilter(null, topics)).toBeNull();
    expect(resolveQuestionTopicFilter(undefined, topics)).toBeNull();
    expect(resolveQuestionTopicFilter(101, [])).toBeNull();
  });
});

describe('groupQuestionTopicsBySubject', () => {
  it('groups topics under their subject following curriculum subject order', () => {
    const groups = groupQuestionTopicsBySubject(topics, [
      { id: 8, label: 'Informatika' },
      { id: 7, label: 'Matematika' },
    ]);
    expect(groups.map((group) => group.label)).toEqual(['Informatika', 'Matematika']);
    expect(groups[0].topics.map((entry) => entry.id)).toEqual([103]);
    // Urutan topik di dalam kelompok mengikuti urutan data yang diterima.
    expect(groups[1].topics.map((entry) => entry.id)).toEqual([101, 102]);
  });

  it('falls back to appearance order and topic subject labels without a subject list', () => {
    const groups = groupQuestionTopicsBySubject(topics);
    expect(groups.map((group) => group.label)).toEqual(['Matematika', 'Informatika']);
    expect(groups[0].topics.map((entry) => entry.id)).toEqual([101, 102]);
  });
});
