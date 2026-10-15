import { describe, expect, it } from 'vitest';
import { normalizeAttemptOrder, orderExamReviewItems } from '@/services/exam-service';

describe('orderExamReviewItems', () => {
  it('uses the persisted attempt order instead of answer submission order', () => {
    const rows = [
      { question_id: 202, question_text: 'Soal kedua' },
      { question_id: 101, question_text: 'Soal pertama' },
    ];

    expect(orderExamReviewItems(rows, [101, 202])).toEqual([
      { question_id: 101, question_text: 'Soal pertama', question_number: 1 },
      { question_id: 202, question_text: 'Soal kedua', question_number: 2 },
    ]);
  });
});

describe('normalizeAttemptOrder', () => {
  it('preserves a persisted order when MySQL returns JSON columns as text', () => {
    expect(normalizeAttemptOrder('[101,202,707]', '{"101":["C","A","B"],"202":["B","A"]}')).toEqual({
      question_order: [101, 202, 707],
      option_order: {
        '101': ['C', 'A', 'B'],
        '202': ['B', 'A'],
      },
    });
  });
});
