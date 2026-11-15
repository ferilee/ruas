import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { createDemoToken, createToken } from '../lib/auth-store';
import {
  HANDOFF_TOKEN_TTL_MS,
  createFailedAttemptLimiter,
  generateHandoffToken,
  handoffTargetPath,
  hashHandoffToken,
  secretsMatch,
  type HandoffTarget,
} from '../lib/simak-handoff';
import type { Pool } from '../db/connection';
import {
  createSimakInternalDb,
  findActiveUser,
  findTopic,
  getLatestFinishedScores,
  getStudentAssessments,
  hasCompletedAttempt,
  listSimakTopics,
  redeemHandoffToken,
  storeHandoffToken,
} from '../services/simak-internal-service';

// Endpoint server-ke-server SIMAK -> RUAS (Hub Murid Tahap 2, rancangan
// bagian 3a/3c). Seluruh grup dijaga rahasia bersama pada header
// "x-internal-secret" yang dibandingkan konstan-waktu terhadap env
// SIMAK_INTERNAL_SECRET. Bila env itu tidak disetel, grup ini menjawab 404
// (fitur belum diaktifkan); rahasia yang salah/tidak ada menjawab 401.
// Token dan rahasia tidak pernah ditulis ke log.

const attemptStatusBodySchema = z.object({
  username: z.string().trim().min(1),
  topic_id: z.number().int().positive(),
  subject_id: z.number().int().positive().optional(),
});

const scoresBodySchema = z.object({
  topic_id: z.number().int().positive(),
  subject_id: z.number().int().positive().optional(),
  usernames: z.array(z.string().trim().min(1)).max(500),
});

const studentAssessmentsBodySchema = z.object({
  username: z.string().trim().min(1),
  topics: z
    .array(
      z.object({
        topic_id: z.number().int().positive(),
        subject_id: z.number().int().positive().optional(),
      }),
    )
    .max(100),
});

const handoffBodySchema = z.object({
  username: z.string().trim().min(1),
  target: z.discriminatedUnion('type', [
    z.object({ type: z.literal('dashboard') }),
    z.object({
      type: z.literal('topic'),
      topic_id: z.number().int().positive(),
      subject_id: z.number().int().positive().optional(),
    }),
  ]),
});

async function readJsonBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

function invalidBody(c: Context) {
  return c.json({ error: 'invalid_body', message: 'Badan permintaan tidak sesuai format.' }, 400);
}

export function simakInternalRoutes(pool: Pool, internalSecret?: string) {
  const app = new Hono();

  app.use('*', async (c, next) => {
    if (!internalSecret) {
      return c.json({ error: 'not_found', message: 'Endpoint tidak tersedia.' }, 404);
    }
    const provided = c.req.header('x-internal-secret');
    if (!provided || !secretsMatch(provided, internalSecret)) {
      return c.json({ error: 'unauthorized', message: 'Rahasia internal tidak valid.' }, 401);
    }
    await next();
  });

  // Kontrak terkunci oleh klien SIMAK (ruas-status.ts): { completed }.
  app.post('/attempt-status', async (c) => {
    const parsed = attemptStatusBodySchema.safeParse(await readJsonBody(c));
    if (!parsed.success) return invalidBody(c);
    const db = createSimakInternalDb(pool);
    const completed = await hasCompletedAttempt(db, parsed.data.username, parsed.data.topic_id, parsed.data.subject_id ?? null);
    return c.json({ completed });
  });

  app.post('/scores', async (c) => {
    const parsed = scoresBodySchema.safeParse(await readJsonBody(c));
    if (!parsed.success) return invalidBody(c);
    const db = createSimakInternalDb(pool);
    const scores = await getLatestFinishedScores(db, parsed.data.topic_id, parsed.data.subject_id ?? null, parsed.data.usernames);
    return c.json({ scores: Object.fromEntries(scores) });
  });

  app.post('/student-assessments', async (c) => {
    const parsed = studentAssessmentsBodySchema.safeParse(await readJsonBody(c));
    if (!parsed.success) return invalidBody(c);
    const db = createSimakInternalDb(pool);
    const assessments = await getStudentAssessments(
      db,
      parsed.data.username,
      parsed.data.topics.map((entry) => ({ topic_id: entry.topic_id, subject_id: entry.subject_id ?? null })),
    );
    return c.json({ assessments });
  });

  app.get('/topics', async (c) => {
    const db = createSimakInternalDb(pool);
    const topics = await listSimakTopics(db);
    return c.json({ topics });
  });

  app.post('/handoff', async (c) => {
    const parsed = handoffBodySchema.safeParse(await readJsonBody(c));
    if (!parsed.success) return invalidBody(c);
    const db = createSimakInternalDb(pool);

    const user = await findActiveUser(db, parsed.data.username);
    if (!user) {
      return c.json({ error: 'user_not_found', message: 'Pengguna tidak ditemukan atau tidak aktif.' }, 404);
    }

    const target: HandoffTarget =
      parsed.data.target.type === 'topic'
        ? { type: 'topic', topic_id: parsed.data.target.topic_id, subject_id: parsed.data.target.subject_id ?? null }
        : { type: 'dashboard' };
    if (target.type === 'topic' && !(await findTopic(db, target.topic_id))) {
      return c.json({ error: 'invalid_target', message: 'Topik tujuan tidak ditemukan.' }, 400);
    }

    const rawToken = generateHandoffToken();
    await storeHandoffToken(db, {
      tokenHash: hashHandoffToken(rawToken),
      username: user.username,
      target,
      expiresAt: new Date(Date.now() + HANDOFF_TOKEN_TTL_MS),
    });

    const origin = new URL(c.req.url).origin;
    return c.json({ url: `${origin}/masuk-simak/${rawToken}` });
  });

  return app;
}

// Rute penukaran yang dibuka peramban murid. Token pada URL adalah token
// serah-terima sekali pakai; username sesi diambil dari baris token, tidak
// pernah dari parameter URL. Semua kegagalan dialihkan ke halaman login
// biasa tanpa pesan teknis. Sesi yang terbentuk adalah sesi peserta RUAS
// biasa (lib/auth-store) yang tokennya diserahkan ke aplikasi web lewat
// fragmen URL "#simak-sesi=" — fragmen tidak dikirim ke server dan tidak
// masuk log — untuk disimpan frontend ke sessionStorage.
const redeemFailureLimiter = createFailedAttemptLimiter();

export function simakHandoffRedeemRoutes(pool: Pool) {
  const app = new Hono();

  app.get('/masuk-simak/:token', async (c) => {
    const loginUrl = '/auth';
    const clientKey = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (redeemFailureLimiter.isBlocked(clientKey)) {
      return c.redirect(loginUrl, 302);
    }

    const rawToken = c.req.param('token');
    const db = createSimakInternalDb(pool);
    const redeemed = rawToken ? await redeemHandoffToken(db, hashHandoffToken(rawToken)) : null;
    if (!redeemed) {
      redeemFailureLimiter.recordFailure(clientKey);
      return c.redirect(loginUrl, 302);
    }

    const user = await findActiveUser(db, redeemed.username);
    const sessionToken = user?.is_demo ? createDemoToken(redeemed.username) : createToken(redeemed.username);
    const destination = `${handoffTargetPath(redeemed.target)}#simak-sesi=${sessionToken}`;
    return c.redirect(destination, 302);
  });

  return app;
}
