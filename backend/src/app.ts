import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth';
import { adminAuthRoutes } from './routes/admin-auth';
import { adminQuestionRoutes } from './routes/admin-questions';
import { adminTopicsRoutes } from './routes/admin-topics';
import { adminScheduleRoutes } from './routes/admin-schedule';
import { assessmentScheduleRoutes } from './routes/assessment-schedule';
import { examExitRoutes } from './routes/exam-exit';
import { curriculumRoutes } from './routes/curriculum';
import { adminCurriculumRoutes } from './routes/admin-curriculum';
import { participantProfileRoutes } from './routes/participant-profile';
import { examAttemptRoutes } from './routes/exam-attempts';
import { subjectsRoutes } from './routes/subjects';
import { topicsRoutes } from './routes/topics';
import { questionsRoutes } from './routes/questions';
import { createRequireAuth } from './middleware/require-auth';
import { adminUserRoutes } from './routes/admin-users';
import { requireAdminAuth } from './middleware/require-admin-auth';
import { adminReportRoutes } from './routes/admin-reports';
import { adminRealtimeRoutes } from './routes/admin-realtime';
import { publishRealtimeEvent } from './lib/realtime-events';
import type { Pool } from './db/connection';
import type { MediaStorage } from './services/media-storage';

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
    authUsername: string | undefined;
  }
}

interface AppConfig {
  pool: Pool;
  corsOrigin: string;
  appUsername?: string;
  appPassword: string;
  adminPassword?: string;
  examExitPassword?: string;
  mediaStorage?: MediaStorage | null;
}

export function createApp(config: AppConfig) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.use('/api/*', async (c, next) => {
    c.set('requestId', crypto.randomUUID());
    await next();
  });

  app.use(
    '/api/*',
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  );

  app.use('/api/*', async (c, next) => {
    await next();

    const method = c.req.method;
    const path = new URL(c.req.url).pathname;
    const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const observed = path.startsWith('/api/admin/') || path.startsWith('/api/exam/attempts') || path === '/api/profile';
    const excluded = path === '/api/admin/auth' || path === '/api/admin/realtime' || path === '/api/auth';

    if (mutating && observed && !excluded && c.res.status >= 200 && c.res.status < 300) {
      publishRealtimeEvent({ resource: realtimeResource(path), method, path });
    }
  });

  app.route('/api/auth', authRoutes(config.appUsername ?? '', config.appPassword, config.pool));
  app.route('/api/admin/auth', adminAuthRoutes(config.adminPassword ?? ''));

  const authMiddleware = createRequireAuth(config.pool, config.appPassword);
  app.use('/api/subjects', authMiddleware);
  app.use('/api/topics', authMiddleware);
  app.use('/api/questions', authMiddleware);
  app.use('/api/schedule', authMiddleware);
  app.use('/api/exam/exit', authMiddleware);
  app.use('/api/curriculum', authMiddleware);
  app.use('/api/profile', authMiddleware);
  app.use('/api/exam/attempts', authMiddleware);
  app.use('/api/exam/attempts/*', authMiddleware);

  app.use('/api/admin/questions', requireAdminAuth);
  app.use('/api/admin/topics', requireAdminAuth);
  app.use('/api/admin/schedule', requireAdminAuth);
  app.use('/api/admin/curriculum', requireAdminAuth);
  app.use('/api/admin/users', requireAdminAuth);
  app.use('/api/admin/users/*', requireAdminAuth);
  app.use('/api/admin/reports', requireAdminAuth);
  app.use('/api/admin/realtime', requireAdminAuth);

  app.onError((err, c) => {
    const requestId = c.get('requestId') ?? 'unknown';
    console.error(`[error] [${requestId}]`, err);
    return c.json(
      {
        error: 'internal_server_error',
        message: 'Terjadi kesalahan server.',
        request_id: requestId,
      },
      500,
    );
  });

  app.route('/api/subjects', subjectsRoutes(config.pool));
  app.route('/api/topics', topicsRoutes(config.pool));
  app.route('/api/questions', questionsRoutes(config.pool, config.mediaStorage ?? null));
  app.route('/api/admin/questions', adminQuestionRoutes(config.pool, config.mediaStorage ?? null));
  app.route('/api/admin/topics', adminTopicsRoutes(config.pool));
  app.route('/api/schedule', assessmentScheduleRoutes(config.pool));
  app.route('/api/admin/schedule', adminScheduleRoutes(config.pool));
  app.route('/api/exam/exit', examExitRoutes(config.examExitPassword ?? config.adminPassword ?? ''));
  app.route('/api/curriculum', curriculumRoutes(config.pool));
  app.route('/api/profile', participantProfileRoutes(config.pool));
  app.route('/api/exam/attempts', examAttemptRoutes(config.pool, config.mediaStorage ?? null));
  app.route('/api/admin/curriculum', adminCurriculumRoutes(config.pool));
  app.route('/api/admin/users', adminUserRoutes(config.pool));
  app.route('/api/admin/reports', adminReportRoutes(config.pool));
  app.route('/api/admin/realtime', adminRealtimeRoutes());

  if (process.env.NODE_ENV === 'production') {
    const distDir = '../frontend/dist';
    app.get('/assets/*', serveStatic({ root: distDir }));
    app.get('/templates/*', serveStatic({ root: distDir }));
    app.get('/favicon.svg', serveStatic({ root: distDir }));
    app.get('/manifest.webmanifest', serveStatic({ root: distDir }));
    app.get('/sw.js', serveStatic({ root: distDir }));
    app.get('/pwa-192.svg', serveStatic({ root: distDir }));
    app.get('/pwa-512.svg', serveStatic({ root: distDir }));
    app.get('/pwa-192.png', serveStatic({ root: distDir }));
    app.get('/pwa-512.png', serveStatic({ root: distDir }));
    app.get('/apple-touch-icon.png', serveStatic({ root: distDir }));
    app.get('/og-image.png', serveStatic({ root: distDir }));
    app.get('/*', () => {
      const file = Bun.file(`${distDir}/index.html`);
      return new Response(file, {
        headers: { 'Content-Type': 'text/html' },
      });
    });
  }

  return app;
}

function realtimeResource(path: string) {
  if (path.startsWith('/api/exam/attempts')) return 'attempts';
  if (path.startsWith('/api/admin/reports')) return 'reports';
  if (path.startsWith('/api/admin/users')) return 'users';
  if (path.startsWith('/api/admin/questions')) return 'questions';
  if (path.startsWith('/api/admin/topics')) return 'topics';
  if (path.startsWith('/api/admin/schedule')) return 'schedule';
  if (path.startsWith('/api/admin/curriculum')) return 'curriculum';
  return 'data';
}
