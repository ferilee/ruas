import { describe, expect, it } from 'vitest';
import { orderExamReviewItems } from '@/services/exam-service';

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
