import { describe, it, expect } from 'vitest';
import { checkAnswer, checkStatementJudgements } from '@/lib/scoring.js';

const sampleOptions = [
  { key: 'A', is_correct: false },
  { key: 'B', is_correct: true },
  { key: 'C', is_correct: false },
  { key: 'D', is_correct: false },
];

const multiOptions = [
  { key: 'A', is_correct: true },
  { key: 'B', is_correct: false },
  { key: 'C', is_correct: true },
  { key: 'D', is_correct: false },
];

const tfOptions = [
  { key: 'true', is_correct: true },
  { key: 'false', is_correct: false },
];

describe('checkAnswer - single_choice', () => {
  it('returns correct when match', () => {
    const result = checkAnswer('single_choice', ['B'], sampleOptions);
    expect(result.correct).toBe(true);
    expect(result.correct_keys).toEqual(['B']);
  });

  it('returns incorrect when no match', () => {
    const result = checkAnswer('single_choice', ['A'], sampleOptions);
    expect(result.correct).toBe(false);
    expect(result.correct_keys).toEqual(['B']);
  });

  it('returns incorrect when empty selection', () => {
    const result = checkAnswer('single_choice', [''], sampleOptions);
    expect(result.correct).toBe(false);
  });

  it('returns correct_keys regardless of correctness', () => {
    const result = checkAnswer('single_choice', ['C'], sampleOptions);
    expect(result.correct).toBe(false);
    expect(result.correct_keys).toEqual(['B']);
  });

  it('returns incorrect when multiple keys are submitted', () => {
    const result = checkAnswer('single_choice', ['B', 'A'], sampleOptions);
    expect(result.correct).toBe(false);
    expect(result.correct_keys).toEqual(['B']);
  });
});

describe('checkAnswer - multiple_response', () => {
  it('returns correct when all correct selected', () => {
    const result = checkAnswer('multiple_response', ['A', 'C'], multiOptions);
    expect(result.correct).toBe(true);
    expect(result.correct_keys).toEqual(['A', 'C']);
  });

  it('returns incorrect when partial', () => {
    const result = checkAnswer('multiple_response', ['A'], multiOptions);
    expect(result.correct).toBe(false);
  });

  it('returns incorrect when extra selected', () => {
    const result = checkAnswer('multiple_response', ['A', 'B', 'C'], multiOptions);
    expect(result.correct).toBe(false);
  });

  it('returns incorrect when all wrong', () => {
    const result = checkAnswer('multiple_response', ['B', 'D'], multiOptions);
    expect(result.correct).toBe(false);
  });

  it('returns incorrect when empty', () => {
    const result = checkAnswer('multiple_response', [], multiOptions);
    expect(result.correct).toBe(false);
  });

  it('returns incorrect when duplicate keys are submitted', () => {
    const result = checkAnswer('multiple_response', ['A', 'A'], multiOptions);
    expect(result.correct).toBe(false);
    expect(result.correct_keys).toEqual(['A', 'C']);
  });
});

describe('checkAnswer - true_false', () => {
  it('returns correct when select true and true is correct', () => {
    const result = checkAnswer('true_false', ['true'], tfOptions);
    expect(result.correct).toBe(true);
    expect(result.correct_keys).toEqual(['true']);
  });

  it('returns incorrect when select false', () => {
    const result = checkAnswer('true_false', ['false'], tfOptions);
    expect(result.correct).toBe(false);
  });
});

describe('checkStatementJudgements - true_false_multi', () => {
  const statements = [
    { key: 'S1', is_correct: true },
    { key: 'S2', is_correct: false },
    { key: 'S3', is_correct: true },
    { key: 'S4', is_correct: false },
  ];

  it('returns fraction 1 and correct when every judgement is exact', () => {
    const result = checkStatementJudgements(['S1', 'S3'], statements);
    expect(result.correct).toBe(true);
    expect(result.fraction).toBe(1);
    expect(result.correct_keys).toEqual(['S1', 'S3']);
    expect(result.statement_results.every((entry) => entry.correct)).toBe(true);
  });

  it('returns partial fraction when some judgements miss', () => {
    const result = checkStatementJudgements(['S1', 'S2', 'S3'], statements);
    expect(result.correct).toBe(false);
    expect(result.fraction).toBe(0.75);
    expect(result.statement_results).toEqual([
      { key: 'S1', judged_true: true, correct: true },
      { key: 'S2', judged_true: true, correct: false },
      { key: 'S3', judged_true: true, correct: true },
      { key: 'S4', judged_true: false, correct: true },
    ]);
  });

  it('accepts an empty selection as judging every statement Salah', () => {
    const result = checkStatementJudgements([], statements);
    expect(result.correct).toBe(false);
    expect(result.fraction).toBe(0.5);
    expect(result.statement_results.map((entry) => entry.judged_true)).toEqual([false, false, false, false]);
  });

  it('returns fraction 0 when every judgement misses', () => {
    const result = checkStatementJudgements(['S2', 'S4'], statements);
    expect(result.correct).toBe(false);
    expect(result.fraction).toBe(0);
  });
});
