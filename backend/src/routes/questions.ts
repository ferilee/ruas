import { Hono } from 'hono';
import type { Context } from 'hono';
import { checkAnswer } from '../lib/scoring';
import type { Pool } from '../db/connection';
import type { QuestionType } from '../lib/scoring';
import {
  mapCheckAnswerResponse,
  mapEmptyRandomQuestionResponse,
  mapRandomQuestionResponse,
} from '../mappers/question-response';
import {
  countQuestionsForTopic,
  createQuestionsDb,
  findQuestionAnswerKey,
  findQuestionById,
  findQuestionFeedbackSettings,
  findQuestionOptions,
  findRandomQuestion,
} from '../services/question-service';
import {
  parseCheckAnswerBody,
  parseExcludeIds,
  parseQuestionIdParam,
  parseRandomQuestionQuery,
  validateSelectedKeys,
} from '../validators/question-validator';
import { getAssessmentScheduleStatusFromDb } from '@/services/assessment-schedule-service';
import { canAccessTopic, getTopicAccess, verifyTopicAccess } from '@/services/topic-access-service';

type QuestionsDb = ReturnType<typeof createQuestionsDb>;

async function requireAssessmentOpen(c: Context, db: QuestionsDb) {
  const schedule = await getAssessmentScheduleStatusFromDb(db);
  if (!schedule.is_open) {
    return c.json(
      {
        error: 'assessment_not_started',
        message: 'Asesmen belum dibuka oleh editor.',
        schedule,
      },
      403,
    );
  }

  return null;
}

async function requireTopicAccess(c: Context, db: QuestionsDb, topicId: number) {
  const access = await getTopicAccess(db, topicId);
  if (!access) return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
  if (!canAccessTopic(access, c.req.header('x-topic-access-token'))) {
    return c.json({ error: 'topic_token_required', message: 'Masukkan token topik sebelum mengakses soal.' }, 403);
  }
  return null;
}

export function questionsRoutes(pool: Pool) {
  const db = createQuestionsDb(pool);
  const app = new Hono();

  app.get('/count', async (c) => {
    const scheduleError = await requireAssessmentOpen(c, db);
    if (scheduleError) return scheduleError;

    const parsed = parseRandomQuestionQuery(c.req.query());

    if (!parsed.success) {
      return c.json({ error: 'invalid_query', message: 'topic_id harus berupa angka positif.' }, 400);
    }

    const topicAccessError = await requireTopicAccess(c, db, parsed.data.topic_id);
    if (topicAccessError) return topicAccessError;

    const total = await countQuestionsForTopic(db, parsed.data.topic_id);
    return c.json({ count: total });
  });

  app.get('/random', async (c) => {
    const scheduleError = await requireAssessmentOpen(c, db);
    if (scheduleError) return scheduleError;

    const parsed = parseRandomQuestionQuery(c.req.query());

    if (!parsed.success) {
      return c.json({ error: 'invalid_query', message: 'topic_id harus berupa angka positif.' }, 400);
    }

    const topicAccessError = await requireTopicAccess(c, db, parsed.data.topic_id);
    if (topicAccessError) return topicAccessError;

    const excludeIds = parseExcludeIds(parsed.data.exclude);
    const question = await findRandomQuestion(db, parsed.data.topic_id, excludeIds);

    if (!question) {
      return c.json(mapEmptyRandomQuestionResponse());
    }

    const options = await findQuestionOptions(db, question.id);
    return c.json(mapRandomQuestionResponse(question, options));
  });

  app.post('/:id/check', async (c) => {
    const scheduleError = await requireAssessmentOpen(c, db);
    if (scheduleError) return scheduleError;

    const id = parseQuestionIdParam(c.req.param('id'));

    if (id === null) {
      return c.json({ error: 'invalid_param', message: 'ID soal tidak valid.' }, 400);
    }

    const body = await c.req.json();
    const parsed = parseCheckAnswerBody(body);

    if (!parsed.success) {
      return c.json({ error: 'invalid_body', message: 'Body tidak valid. selected_keys wajib diisi.' }, 400);
    }

    const question = await findQuestionById(db, id);

    if (!question) {
      return c.json({ error: 'not_found', message: 'Soal tidak ditemukan.' }, 404);
    }

    const topicAccess = await verifyTopicAccess(db, question.topic_id, c.req.header('x-topic-access-token'));
    if (topicAccess === null) return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
    if (!topicAccess) return c.json({ error: 'topic_token_required', message: 'Masukkan token topik sebelum memeriksa jawaban.' }, 403);

    const options = await findQuestionAnswerKey(db, id);

    const validationError = validateSelectedKeys(
      question.type as QuestionType,
      parsed.data.selected_keys,
      options.map((option) => option.key),
    );

    if (validationError) {
      return c.json({ error: 'invalid_body', message: validationError }, 400);
    }

    const result = checkAnswer(question.type as QuestionType, parsed.data.selected_keys, options);
    const settings = await findQuestionFeedbackSettings(db, id);
    const explanationMode = settings.explanation_mode;
    const revealCorrectAnswer = result.correct || settings.show_correct_answer_on_wrong;
    return c.json(mapCheckAnswerResponse(question, result, revealCorrectAnswer && explanationMode === 'after_answer' ? question.explanation_text : null, explanationMode, revealCorrectAnswer));
  });

  return app;
}
