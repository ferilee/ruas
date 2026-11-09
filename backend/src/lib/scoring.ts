export type QuestionType = 'single_choice' | 'multiple_response' | 'true_false' | 'true_false_multi';

export interface StatementResult {
  key: string;
  judged_true: boolean;
  correct: boolean;
}

export interface StatementCheckResult {
  correct: boolean;
  correct_keys: string[];
  fraction: number;
  statement_results: StatementResult[];
}

/**
 * Evaluates per-statement Benar/Salah judgements for `true_false_multi`.
 * selectedKeys holds the keys of the statements the student judged Benar;
 * any statement absent from selectedKeys was judged Salah. Scoring is
 * partial: fraction = exact judgements / total statements, and the
 * question counts as correct only when every statement is exact.
 */
export function checkStatementJudgements(
  selectedKeys: string[],
  statements: QuestionOption[],
): StatementCheckResult {
  const judgedTrue = new Set(selectedKeys);
  const statementResults = statements.map((statement) => {
    const isTrue = judgedTrue.has(statement.key);
    return { key: statement.key, judged_true: isTrue, correct: isTrue === statement.is_correct };
  });
  const exactCount = statementResults.filter((result) => result.correct).length;
  const fraction = statements.length ? exactCount / statements.length : 0;

  return {
    correct: statements.length > 0 && exactCount === statements.length,
    correct_keys: statements.filter((statement) => statement.is_correct).map((statement) => statement.key),
    fraction,
    statement_results: statementResults,
  };
}

export interface CheckResult {
  correct: boolean;
  correct_keys: string[];
  explanation: string;
}

export interface QuestionOption {
  key: string;
  is_correct: boolean;
}

/**
 * Evaluates a user's answer against the correct options.
 * single_choice: exactly one selected must match the correct key
 * multiple_response: all selected must be correct AND all correct must be selected (all-or-nothing)
 * true_false: same as single_choice but key is 'true' or 'false'
 */
export function checkAnswer(
  type: QuestionType,
  selectedKeys: string[],
  correctOptions: QuestionOption[],
): { correct: boolean; correct_keys: string[] } {
  const correctKeys = correctOptions
    .filter((o) => o.is_correct)
    .map((o) => o.key);

  if (type === 'single_choice' || type === 'true_false') {
    if (selectedKeys.length !== 1) {
      return { correct: false, correct_keys: correctKeys };
    }

    const selected = selectedKeys[0] ?? '';
    const correct = correctKeys.includes(selected);
    return { correct, correct_keys: correctKeys };
  }

  if (type === 'multiple_response') {
    if (new Set(selectedKeys).size !== selectedKeys.length) {
      return { correct: false, correct_keys: correctKeys };
    }

    if (selectedKeys.length !== correctKeys.length) {
      return { correct: false, correct_keys: correctKeys };
    }
    const selectedSet = new Set(selectedKeys);
    const allCorrect = correctKeys.every((k) => selectedSet.has(k));
    return { correct: allCorrect, correct_keys: correctKeys };
  }

  return { correct: false, correct_keys: correctKeys };
}
