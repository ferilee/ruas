import { describe, expect, it } from 'vitest';
import { mapCheckAnswerResponse } from '@/mappers/question-response';

describe('mapCheckAnswerResponse', () => {
  const question = { explanation_text: 'Gunakan rumus yang sesuai.' };
  const incorrectResult = { correct: false, correct_keys: ['B'] };

  it('hides the answer key and explanation when the admin disables feedback', () => {
    expect(mapCheckAnswerResponse(question, incorrectResult, question.explanation_text, 'after_answer', false)).toEqual({
      correct: false,
      correct_keys: [],
      explanation: null,
      explanation_mode: 'after_answer',
      correct_answer_hidden: true,
    });
  });

  it('keeps the answer key and explanation when feedback is enabled', () => {
    expect(mapCheckAnswerResponse(question, incorrectResult, question.explanation_text, 'after_answer', true)).toEqual({
      correct: false,
      correct_keys: ['B'],
      explanation: question.explanation_text,
      explanation_mode: 'after_answer',
      correct_answer_hidden: false,
    });
  });
});
