import type { QuestionType } from '@/lib/scoring';
import type { QuestionMediaResponse } from '@/services/question-media-service';

interface QuestionOptionResponse {
  key: string;
  text: string;
}

interface QuestionRow {
  id: number;
  type: string;
  difficulty: string;
  question_text: string;
}

interface CheckQuestionRow {
  explanation_text: string;
}

interface CheckAnswerResult {
  correct: boolean;
  correct_keys: string[];
  fraction?: number;
  statement_results?: Array<{ key: string; judged_true: boolean; correct: boolean }>;
}

export function mapRandomQuestionResponse(
  question: QuestionRow,
  options: QuestionOptionResponse[],
  media: QuestionMediaResponse[] = [],
) {
  return {
    question: {
      id: question.id,
      type: question.type as QuestionType,
      difficulty: question.difficulty,
      question_text: question.question_text,
      options,
      media,
    },
  };
}

export function mapEmptyRandomQuestionResponse() {
  return {
    question: null,
    message: 'Tidak ada soal untuk topik ini.',
  };
}

export function mapCheckAnswerResponse(
  question: CheckQuestionRow,
  result: CheckAnswerResult,
  explanation: string | null = question.explanation_text,
  explanationMode: 'after_answer' | 'after_exam' | 'hidden' = 'after_answer',
  revealCorrectAnswer = true,
) {
  const correctAnswerHidden = !result.correct && !revealCorrectAnswer;
  return {
    correct: result.correct,
    correct_keys: correctAnswerHidden ? [] : result.correct_keys,
    explanation: correctAnswerHidden ? null : explanation,
    explanation_mode: explanationMode,
    correct_answer_hidden: correctAnswerHidden,
    // Bidang aditif untuk soal Benar / Salah (Banyak Pernyataan); ketepatan per
    // pernyataan hanya dibuka bersama kunci jawaban, sama seperti correct_keys.
    ...(result.fraction !== undefined ? { score_fraction: result.fraction } : {}),
    ...(result.statement_results !== undefined
      ? {
          statement_results: result.statement_results.map((statement) => ({
            key: statement.key,
            judged_true: statement.judged_true,
            correct: correctAnswerHidden ? null : statement.correct,
          })),
        }
      : {}),
  };
}
