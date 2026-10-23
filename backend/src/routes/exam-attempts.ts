import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { questionOptions } from '@/db/schema/question-options';
import { questions } from '@/db/schema/questions';
import { topicQuestions } from '@/db/schema/topic-questions';
import type { Pool } from '@/db/connection';
import { getParticipantIdentity } from '@/lib/participant-identity';
import { checkAnswer } from '@/lib/scoring';
import { mapCheckAnswerResponse } from '@/mappers/question-response';
import { createExamDb, abandonAttempt, completeAttempt, createAttempt, findActiveAttempt, findAttempt, findAttemptAnswers, getAttemptAvailability, getAttemptQuestion, getExamReview, getNextAttemptQuestion, getQuestionExplanationMode, getSubjectExamSettings, isAttemptExpired, saveAnswer, saveIntegrityEvent, updateAttemptQuestionFlag } from '@/services/exam-service';
import { getAssessmentScheduleStatusFromDb } from '@/services/assessment-schedule-service';
import type { MediaStorage } from '@/services/media-storage';

const attemptSchema = z.object({ subject_id: z.coerce.number().int().positive(), topic_id: z.coerce.number().int().positive(), total_questions: z.coerce.number().int().nonnegative(), topic_access_token: z.string().trim().max(100).optional() });
const answerSchema = z.object({ question_id: z.coerce.number().int().positive(), selected_keys: z.array(z.string().min(1)).min(1), elapsed_seconds: z.coerce.number().int().nonnegative() });
const eventSchema = z.object({ event_type: z.enum(['fullscreen_exit', 'tab_hidden', 'window_blur', 'blocked_shortcut']), occurred_at: z.string().datetime().optional() });
const flagSchema = z.object({ is_doubtful: z.boolean() });

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function examAttemptRoutes(pool: Pool, mediaStorage: MediaStorage | null = null) {
  const db = createExamDb(pool);
  const app = new Hono();

  app.post('/', async (c) => {
    const identityKey = getParticipantIdentity(c);
    if (!identityKey) return c.json({ error: 'identity_required', message: 'Identitas peserta tidak tersedia.' }, 400);
    const parsed = attemptSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: 'Data sesi ujian tidak valid.' }, 400);
    if (typeof (db as { select?: unknown }).select === 'function') {
      const schedule = await getAssessmentScheduleStatusFromDb(db, parsed.data.topic_id, identityKey);
      if (!schedule.is_open) return c.json({ error: 'assessment_not_started', message: 'Asesmen belum dibuka oleh editor.', schedule }, 403);
    }
    const created = await createAttempt(db, identityKey, parsed.data);
    if (!created) return c.json({ error: 'profile_required', message: 'Lengkapi profil peserta terlebih dahulu.' }, 400);
    if ('assignmentMismatch' in created && created.assignmentMismatch) {
      return c.json({ error: 'assignment_mismatch', message: 'Asesmen ini tidak sesuai dengan penugasan akun siswa.' }, 403);
    }
    if ('tokenRequired' in created && created.tokenRequired) {
      return c.json({ error: 'topic_token_required', message: 'Masukkan token topik sebelum memulai asesmen.' }, 403);
    }
    if (created.limited) return c.json({ error: 'attempt_limit_reached', message: 'Batas percobaan untuk asesmen ini sudah habis.', availability: created.availability }, 409);
    return c.json({ attempt: created.attempt, server_now: new Date().toISOString() }, 201);
  });

  app.get('/availability', async (c) => {
    const identityKey = getParticipantIdentity(c);
    const subjectId = parseId(c.req.query('subject_id') || '');
    const topicId = parseId(c.req.query('topic_id') || '');
    if (!identityKey || !subjectId || !topicId) return c.json({ availability: null });
    return c.json({ availability: await getAttemptAvailability(db, identityKey, subjectId, topicId) });
  });

  app.get('/active', async (c) => {
    const identityKey = getParticipantIdentity(c);
    const topicId = parseId(c.req.query('topic_id') || '');
    if (!identityKey || !topicId) return c.json({ attempt: null, answers: [], server_now: new Date().toISOString() });
    const attempt = await findActiveAttempt(db, topicId, identityKey);
    return c.json({
      attempt: attempt ? { ...attempt, doubtful_question_ids: Array.isArray(attempt.doubtful_question_ids) ? attempt.doubtful_question_ids : [] } : null,
      answers: attempt ? await findAttemptAnswers(db, attempt.id, identityKey) : [],
      server_now: new Date().toISOString(),
    });
  });

  app.get('/:id/next-question', async (c) => {
    const identityKey = getParticipantIdentity(c);
    const attemptId = parseId(c.req.param('id'));
    if (!identityKey || !attemptId) return c.json({ error: 'invalid_param', message: 'Sesi ujian tidak valid.' }, 400);
    const attempt = await findAttempt(db, attemptId, identityKey);
    if (!attempt) return c.json({ error: 'not_found', message: 'Sesi ujian tidak ditemukan.' }, 404);
    if (attempt.status !== 'in_progress') return c.json({ error: 'attempt_closed', message: 'Sesi ujian sudah ditutup.' }, 409);
    return c.json(await getNextAttemptQuestion(db, attemptId, identityKey, mediaStorage));
  });

  app.get('/:id/questions/:number', async (c) => {
    const identityKey = getParticipantIdentity(c);
    const attemptId = parseId(c.req.param('id'));
    const questionNumber = parseId(c.req.param('number'));
    if (!identityKey || !attemptId || !questionNumber) return c.json({ error: 'invalid_param', message: 'Nomor soal tidak valid.' }, 400);
    const attempt = await findAttempt(db, attemptId, identityKey);
    if (!attempt || attempt.status !== 'in_progress') return c.json({ error: 'attempt_closed', message: 'Sesi ujian sudah ditutup.' }, 409);
    const result = await getAttemptQuestion(db, attemptId, identityKey, questionNumber, mediaStorage);
    if (!result) return c.json({ error: 'not_found', message: 'Soal tidak ditemukan.' }, 404);
    return c.json(result);
  });

  app.patch('/:id/questions/:questionId/flag', async (c) => {
    const identityKey = getParticipantIdentity(c);
    const attemptId = parseId(c.req.param('id'));
    const questionId = parseId(c.req.param('questionId'));
    const parsed = flagSchema.safeParse(await c.req.json());
    if (!identityKey || !attemptId || !questionId || !parsed.success) return c.json({ error: 'invalid_body', message: 'Status ragu-ragu tidak valid.' }, 400);
    const result = await updateAttemptQuestionFlag(db, attemptId, identityKey, questionId, parsed.data.is_doubtful);
    if (!result) return c.json({ error: 'not_found', message: 'Soal tidak ditemukan dalam sesi ini.' }, 404);
    return c.json(result);
  });

  app.post('/:id/answers', async (c) => {
    const identityKey = getParticipantIdentity(c);
    const attemptId = parseId(c.req.param('id'));
    if (!identityKey || !attemptId) return c.json({ error: 'invalid_param', message: 'Sesi ujian tidak valid.' }, 400);
    const attempt = await findAttempt(db, attemptId, identityKey);
    if (!attempt || attempt.status !== 'in_progress') return c.json({ error: 'attempt_closed', message: 'Sesi ujian sudah ditutup.' }, 409);
    if (isAttemptExpired(attempt)) {
      await completeAttempt(db, attemptId, identityKey);
      return c.json({ error: 'time_expired', message: 'Waktu ujian sudah habis.' }, 409);
    }
    const parsed = answerSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: 'Jawaban tidak valid.' }, 400);
    const [question] = await db.select().from(questions).where(eq(questions.id, parsed.data.question_id)).limit(1);
    if (!question) return c.json({ error: 'not_found', message: 'Soal tidak ditemukan.' }, 404);
    const [topicQuestion] = await db
      .select({ question_id: topicQuestions.question_id })
      .from(topicQuestions)
      .where(and(
        eq(topicQuestions.topic_id, attempt.topic_id),
        eq(topicQuestions.question_id, question.id),
        eq(topicQuestions.enabled, true),
      ))
      .limit(1);
    if (!topicQuestion) return c.json({ error: 'invalid_question', message: 'Soal tidak termasuk dalam sesi ujian ini.' }, 400);
    const storedOptions = await db.select().from(questionOptions).where(eq(questionOptions.question_id, question.id));
    const options = storedOptions.map((option) => ({ key: option.option_key, text: option.option_text, is_correct: option.is_correct }));
    const result = checkAnswer(question.type, parsed.data.selected_keys, options);
    await saveAnswer(db, attemptId, { ...parsed.data, is_correct: result.correct });
    const settings = await getSubjectExamSettings(db, attempt.subject_id);
    const explanationMode = await getQuestionExplanationMode(db, question.id);
    const revealCorrectAnswer = result.correct || settings.show_correct_answer_on_wrong;
    return c.json(mapCheckAnswerResponse(question, result, revealCorrectAnswer && explanationMode === 'after_answer' ? question.explanation_text : null, explanationMode, revealCorrectAnswer));
  });

  app.get('/:id/review', async (c) => {
    const identityKey = getParticipantIdentity(c);
    const attemptId = parseId(c.req.param('id'));
    if (!identityKey || !attemptId) return c.json({ error: 'invalid_param', message: 'Sesi ujian tidak valid.' }, 400);
    const review = await getExamReview(db, attemptId, identityKey, mediaStorage);
    if (!review) return c.json({ error: 'not_found', message: 'Sesi ujian tidak ditemukan.' }, 404);
    return c.json(review);
  });

  app.post('/:id/events', async (c) => {
    const identityKey = getParticipantIdentity(c);
    const attemptId = parseId(c.req.param('id'));
    if (!identityKey || !attemptId) return c.json({ error: 'invalid_param', message: 'Sesi ujian tidak valid.' }, 400);
    const attempt = await findAttempt(db, attemptId, identityKey);
    if (!attempt || attempt.status !== 'in_progress') return c.json({ error: 'attempt_closed', message: 'Sesi ujian sudah ditutup.' }, 409);
    if (isAttemptExpired(attempt)) {
      await completeAttempt(db, attemptId, identityKey);
      return c.json({ error: 'time_expired', message: 'Waktu ujian sudah habis.' }, 409);
    }
    const parsed = eventSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: 'Aktivitas ujian tidak valid.' }, 400);
    await saveIntegrityEvent(db, attemptId, parsed.data.event_type, parsed.data.occurred_at ? new Date(parsed.data.occurred_at) : new Date());
    return c.json({ recorded: true });
  });

  app.post('/:id/complete', async (c) => {
    const identityKey = getParticipantIdentity(c);
    const attemptId = parseId(c.req.param('id'));
    if (!identityKey || !attemptId) return c.json({ error: 'invalid_param', message: 'Sesi ujian tidak valid.' }, 400);
    const attempt = await completeAttempt(db, attemptId, identityKey);
    if (!attempt) return c.json({ error: 'not_found', message: 'Sesi ujian tidak ditemukan.' }, 404);
    if ('blocked' in attempt && attempt.blocked) return c.json({ error: 'minimum_duration_not_reached', message: `Ujian belum dapat dikumpulkan. Tunggu hingga ${Math.ceil(attempt.minimum_duration_seconds / 60)} menit pengerjaan.`, minimum_duration_seconds: attempt.minimum_duration_seconds, elapsed_seconds: attempt.elapsed_seconds }, 409);
    return c.json({ attempt });
  });

  app.post('/:id/abandon', async (c) => {
    const identityKey = getParticipantIdentity(c);
    const attemptId = parseId(c.req.param('id'));
    if (!identityKey || !attemptId) return c.json({ error: 'invalid_param', message: 'Sesi ujian tidak valid.' }, 400);
    const attempt = await abandonAttempt(db, attemptId, identityKey);
    if (!attempt) return c.json({ error: 'not_found', message: 'Sesi ujian tidak ditemukan.' }, 404);
    return c.json({ attempt });
  });

  return app;
}
