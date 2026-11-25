import { describe, it, expect } from 'vitest';
import { adminQuestionSchema, importQuestionSchema } from '@/validators/admin-question-validator';

function statementOptions(keys: Array<[string, boolean]>) {
  return keys.map(([key, is_correct]) => ({ key, text: `Pernyataan ${key}`, is_correct }));
}

const baseQuestion = {
  topic_id: 1,
  difficulty: 'medium' as const,
  external_id: null,
  question_text: 'Stimulus bersama.',
  explanation_text: 'Pembahasan.',
};

describe('adminQuestionSchema - true_false_multi', () => {
  it('accepts 4 statements with sequential keys and mixed keys', () => {
    const parsed = adminQuestionSchema.safeParse({
      ...baseQuestion,
      type: 'true_false_multi',
      options: statementOptions([['S1', true], ['S2', false], ['S3', true], ['S4', false]]),
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects fewer than 3 statements', () => {
    const parsed = adminQuestionSchema.safeParse({
      ...baseQuestion,
      type: 'true_false_multi',
      options: statementOptions([['S1', true], ['S2', false]]),
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects more than 6 statements', () => {
    const parsed = adminQuestionSchema.safeParse({
      ...baseQuestion,
      type: 'true_false_multi',
      options: statementOptions([['S1', true], ['S2', false], ['S3', true], ['S4', false], ['S5', true], ['S6', false], ['S7', true]]),
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects non-sequential statement keys', () => {
    const parsed = adminQuestionSchema.safeParse({
      ...baseQuestion,
      type: 'true_false_multi',
      options: statementOptions([['S1', true], ['S3', false], ['S2', true]]),
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects all-true or all-false key sets', () => {
    const allTrue = adminQuestionSchema.safeParse({
      ...baseQuestion,
      type: 'true_false_multi',
      options: statementOptions([['S1', true], ['S2', true], ['S3', true]]),
    });
    const allFalse = adminQuestionSchema.safeParse({
      ...baseQuestion,
      type: 'true_false_multi',
      options: statementOptions([['S1', false], ['S2', false], ['S3', false]]),
    });
    expect(allTrue.success).toBe(false);
    expect(allFalse.success).toBe(false);
  });
});

describe('adminQuestionSchema - short_essay', () => {
  it('accepts an essay question with a grading guide and no options', () => {
    const parsed = adminQuestionSchema.safeParse({
      ...baseQuestion,
      type: 'short_essay',
      grading_guide: 'Nilai penuh bila menyebut dekomposisi dan pola.',
      options: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an essay question without a grading guide', () => {
    const missing = adminQuestionSchema.safeParse({
      ...baseQuestion,
      type: 'short_essay',
      options: [],
    });
    const blank = adminQuestionSchema.safeParse({
      ...baseQuestion,
      type: 'short_essay',
      grading_guide: '   ',
      options: [],
    });
    expect(missing.success).toBe(false);
    expect(blank.success).toBe(false);
  });

  it('rejects an essay question that still carries options', () => {
    const parsed = adminQuestionSchema.safeParse({
      ...baseQuestion,
      type: 'short_essay',
      grading_guide: 'Pedoman.',
      options: statementOptions([['A', true], ['B', false]]),
    });
    expect(parsed.success).toBe(false);
  });

  it('still requires at least two options for legacy types', () => {
    const parsed = adminQuestionSchema.safeParse({
      ...baseQuestion,
      type: 'single_choice',
      options: statementOptions([['A', true]]),
    });
    expect(parsed.success).toBe(false);
  });
});

describe('importQuestionSchema - short_essay', () => {
  it('accepts an imported essay question with a grading guide and no options', () => {
    const parsed = importQuestionSchema.safeParse({
      topic_slug: 'berpikir-komputasional-x',
      type: 'short_essay',
      difficulty: 'medium',
      external_id: 'q_bk_aas_001',
      question_text: 'Jelaskan langkah dekomposisi.',
      explanation_text: 'Pembahasan.',
      grading_guide: 'Pedoman penilaian.',
      options: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an imported essay question without a grading guide', () => {
    const parsed = importQuestionSchema.safeParse({
      topic_slug: 'berpikir-komputasional-x',
      type: 'short_essay',
      difficulty: 'medium',
      external_id: 'q_bk_aas_002',
      question_text: 'Jelaskan langkah dekomposisi.',
      explanation_text: 'Pembahasan.',
      options: [],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('importQuestionSchema - true_false_multi', () => {
  it('accepts an imported statement question in the shared format', () => {
    const parsed = importQuestionSchema.safeParse({
      topic_slug: 'matematika-keuangan-xi',
      type: 'true_false_multi',
      difficulty: 'medium',
      external_id: 'q_matkeu_int_003',
      question_text: 'Stimulus.',
      explanation_text: 'Pembahasan.',
      options: statementOptions([['S1', true], ['S2', false], ['S3', true], ['S4', false]]),
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an imported statement question with a degenerate key set', () => {
    const parsed = importQuestionSchema.safeParse({
      topic_slug: 'matematika-keuangan-xi',
      type: 'true_false_multi',
      difficulty: 'medium',
      external_id: 'q_matkeu_int_099',
      question_text: 'Stimulus.',
      explanation_text: 'Pembahasan.',
      options: statementOptions([['S1', true], ['S2', true], ['S3', true], ['S4', true]]),
    });
    expect(parsed.success).toBe(false);
  });
});
