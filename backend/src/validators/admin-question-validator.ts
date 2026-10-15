import { z } from 'zod';

const optionSchema = z.object({
  key: z.string().min(1).max(5),
  text: z.string().min(1),
  is_correct: z.boolean(),
});

const externalIdSchema = z.preprocess(
  (value) => value === '' ? null : value,
  z.string().min(1).max(100).nullable().optional(),
);

function validateQuestionRules(
  question: { type: 'single_choice' | 'multiple_response' | 'true_false'; options: Array<{ key: string; is_correct: boolean }> },
  ctx: z.RefinementCtx,
) {
  if (new Set(question.options.map((option) => option.key)).size !== question.options.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Setiap opsi harus memiliki key unik.',
      path: ['options'],
    });
  }

  const correctCount = question.options.filter((option) => option.is_correct).length;

  if (question.type === 'single_choice' && correctCount !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Soal single_choice harus memiliki tepat satu jawaban benar.',
      path: ['options'],
    });
  }

  if (question.type === 'multiple_response' && correctCount < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Soal multiple_response harus memiliki minimal dua jawaban benar.',
      path: ['options'],
    });
  }

  if (question.type === 'true_false') {
    const keys = question.options.map((option) => option.key);
    const hasTrueFalseKeys = keys.length === 2 && new Set(keys).size === 2 && keys.includes('true') && keys.includes('false');

    if (!hasTrueFalseKeys) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Soal true_false harus memakai key "true" dan "false".',
        path: ['options'],
      });
    }

    if (correctCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Soal true_false harus memiliki tepat satu jawaban benar.',
        path: ['options'],
      });
    }
  }
}

const questionContentSchema = z.object({
  type: z.enum(['single_choice', 'multiple_response', 'true_false']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  external_id: externalIdSchema,
  question_text: z.string().min(1),
  explanation_text: z.string().min(1),
  options: z.array(optionSchema).min(2),
});

export const adminQuestionSchema = questionContentSchema
  .extend({
    topic_id: z.coerce.number().int().positive(),
    topic_ids: z.array(z.coerce.number().int().positive()).optional(),
  })
  .superRefine(validateQuestionRules);

export const importQuestionSchema = z.object({
  topic_slug: z.string().min(1),
  type: z.enum(['single_choice', 'multiple_response', 'true_false']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  external_id: externalIdSchema,
  question_text: z.string().min(1),
  explanation_text: z.string().min(1),
  options: z.array(optionSchema).min(2),
}).superRefine(validateQuestionRules);

export const importPayloadSchema = z.union([
  z.array(importQuestionSchema),
  z.object({ questions: z.array(importQuestionSchema) }),
]);

export const importRequestSchema = z.object({
  data: z.unknown(),
  mode: z.enum(['insert', 'upsert']).default('insert'),
  dry_run: z.boolean().default(true),
});

export type AdminQuestionInput = z.infer<typeof adminQuestionSchema>;
export type ImportQuestion = z.infer<typeof importQuestionSchema>;
