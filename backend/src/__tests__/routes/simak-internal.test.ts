import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashHandoffToken } from '@/lib/simak-handoff';

const {
  hasCompletedAttemptMock,
  getLatestFinishedScoresMock,
  getStudentAssessmentsMock,
  listSimakTopicsMock,
  findActiveUserMock,
  findTopicMock,
  storeHandoffTokenMock,
  redeemHandoffTokenMock,
  createTokenMock,
  createDemoTokenMock,
} = vi.hoisted(() => ({
  hasCompletedAttemptMock: vi.fn(),
  getLatestFinishedScoresMock: vi.fn(),
  getStudentAssessmentsMock: vi.fn(),
  listSimakTopicsMock: vi.fn(),
  findActiveUserMock: vi.fn(),
  findTopicMock: vi.fn(),
  storeHandoffTokenMock: vi.fn(),
  redeemHandoffTokenMock: vi.fn(),
  createTokenMock: vi.fn(),
  createDemoTokenMock: vi.fn(),
}));

vi.mock('@/services/simak-internal-service', () => ({
  createSimakInternalDb: () => ({}),
  hasCompletedAttempt: hasCompletedAttemptMock,
  getLatestFinishedScores: getLatestFinishedScoresMock,
  getStudentAssessments: getStudentAssessmentsMock,
  listSimakTopics: listSimakTopicsMock,
  findActiveUser: findActiveUserMock,
  findTopic: findTopicMock,
  storeHandoffToken: storeHandoffTokenMock,
  redeemHandoffToken: redeemHandoffTokenMock,
}));

vi.mock('@/lib/auth-store', () => ({
  createToken: createTokenMock,
  createDemoToken: createDemoTokenMock,
}));

const SECRET = 'rahasia-uji-bersama';
const JSON_HEADERS = { 'Content-Type': 'application/json', 'x-internal-secret': SECRET };

function post(app: { request: (url: string, init?: RequestInit) => Promise<Response> }, path: string, body: unknown, headers: Record<string, string> = JSON_HEADERS) {
  return app.request(`http://localhost${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

describe('simakInternalRoutes secret guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('answers 404 for every endpoint when the secret env is not set', async () => {
    const { simakInternalRoutes } = await import('@/routes/simak-internal');
    const app = simakInternalRoutes({} as never, undefined);
    const res = await app.request('http://localhost/topics', { headers: { 'x-internal-secret': 'apa-pun' } });
    expect(res.status).toBe(404);
    const postRes = await post(app, '/attempt-status', { username: 'siswa1', topic_id: 7 }, { 'Content-Type': 'application/json' });
    expect(postRes.status).toBe(404);
  });

  it('rejects requests without the secret header', async () => {
    const { simakInternalRoutes } = await import('@/routes/simak-internal');
    const app = simakInternalRoutes({} as never, SECRET);
    const res = await post(app, '/attempt-status', { username: 'siswa1', topic_id: 7 }, { 'Content-Type': 'application/json' });
    expect(res.status).toBe(401);
    expect(hasCompletedAttemptMock).not.toHaveBeenCalled();
  });

  it('rejects requests with a wrong secret', async () => {
    const { simakInternalRoutes } = await import('@/routes/simak-internal');
    const app = simakInternalRoutes({} as never, SECRET);
    const res = await app.request('http://localhost/topics', { headers: { 'x-internal-secret': 'rahasia-salah' } });
    expect(res.status).toBe(401);
    expect(listSimakTopicsMock).not.toHaveBeenCalled();
  });
});

describe('simakInternalRoutes endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('answers attempt-status with the locked { completed } contract', async () => {
    hasCompletedAttemptMock.mockResolvedValue(true);
    const { simakInternalRoutes } = await import('@/routes/simak-internal');
    const app = simakInternalRoutes({} as never, SECRET);
    const res = await post(app, '/attempt-status', { username: 'siswa1', topic_id: 7, subject_id: 3 });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ completed: true });
    expect(hasCompletedAttemptMock).toHaveBeenCalledWith(expect.anything(), 'siswa1', 7, 3);

    hasCompletedAttemptMock.mockResolvedValue(false);
    const resFalse = await post(app, '/attempt-status', { username: 'siswa1', topic_id: 7 });
    await expect(resFalse.json()).resolves.toEqual({ completed: false });
  });

  it('rejects an invalid attempt-status body', async () => {
    const { simakInternalRoutes } = await import('@/routes/simak-internal');
    const app = simakInternalRoutes({} as never, SECRET);
    const res = await post(app, '/attempt-status', { username: 'siswa1', topic_id: 'tujuh' });
    expect(res.status).toBe(400);
  });

  it('answers scores per username with null for unknown students', async () => {
    getLatestFinishedScoresMock.mockResolvedValue(
      new Map<string, { score: number; finished_at: string | null } | null>([
        ['siswa1', { score: 70, finished_at: '2026-11-14T10:00:00.000Z' }],
        ['siswa-asing', null],
      ]),
    );
    const { simakInternalRoutes } = await import('@/routes/simak-internal');
    const app = simakInternalRoutes({} as never, SECRET);
    const res = await post(app, '/scores', { topic_id: 7, usernames: ['siswa1', 'siswa-asing'] });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      scores: { siswa1: { score: 70, finished_at: '2026-11-14T10:00:00.000Z' }, 'siswa-asing': null },
    });
  });

  it('answers student assessments for the requested topics', async () => {
    getStudentAssessmentsMock.mockResolvedValue([
      { topic_id: 7, title: 'Eksponen', status: 'finished', score: 88, finished_at: '2026-11-14T10:00:00.000Z' },
    ]);
    const { simakInternalRoutes } = await import('@/routes/simak-internal');
    const app = simakInternalRoutes({} as never, SECRET);
    const res = await post(app, '/student-assessments', { username: 'siswa1', topics: [{ topic_id: 7, subject_id: 3 }] });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      assessments: [{ topic_id: 7, title: 'Eksponen', status: 'finished', score: 88, finished_at: '2026-11-14T10:00:00.000Z' }],
    });
  });

  it('lists topics for the SIMAK teacher picker', async () => {
    listSimakTopicsMock.mockResolvedValue([{ id: 7, title: 'Eksponen', subject_id: 3, subject_name: 'Matematika' }]);
    const { simakInternalRoutes } = await import('@/routes/simak-internal');
    const app = simakInternalRoutes({} as never, SECRET);
    const res = await app.request('http://localhost/topics', { headers: { 'x-internal-secret': SECRET } });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      topics: [{ id: 7, title: 'Eksponen', subject_id: 3, subject_name: 'Matematika' }],
    });
  });
});

describe('simakInternalRoutes handoff issuing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findActiveUserMock.mockResolvedValue({ username: 'siswa1', is_demo: 0 });
    storeHandoffTokenMock.mockResolvedValue(undefined);
  });

  it('rejects a handoff for an unknown username', async () => {
    findActiveUserMock.mockResolvedValue(null);
    const { simakInternalRoutes } = await import('@/routes/simak-internal');
    const app = simakInternalRoutes({} as never, SECRET);
    const res = await post(app, '/handoff', { username: 'tidak-ada', target: { type: 'dashboard' } });
    expect(res.status).toBe(404);
    expect(storeHandoffTokenMock).not.toHaveBeenCalled();
  });

  it('issues a dashboard handoff url and stores only the token hash', async () => {
    const { simakInternalRoutes } = await import('@/routes/simak-internal');
    const app = simakInternalRoutes({} as never, SECRET);
    const res = await post(app, '/handoff', { username: 'siswa1', target: { type: 'dashboard' } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { url: string };
    expect(body.url).toContain('/masuk-simak/');
    const rawToken = body.url.split('/masuk-simak/')[1] as string;
    expect(rawToken.length).toBeGreaterThanOrEqual(22);

    expect(storeHandoffTokenMock).toHaveBeenCalledTimes(1);
    const stored = storeHandoffTokenMock.mock.calls[0]?.[1] as { tokenHash: string; username: string; expiresAt: Date };
    expect(stored.username).toBe('siswa1');
    expect(stored.tokenHash).toBe(hashHandoffToken(rawToken));
    expect(stored.tokenHash).not.toBe(rawToken);
    expect(stored.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(60_000);
  });

  it('rejects a handoff to an unknown topic', async () => {
    findTopicMock.mockResolvedValue(null);
    const { simakInternalRoutes } = await import('@/routes/simak-internal');
    const app = simakInternalRoutes({} as never, SECRET);
    const res = await post(app, '/handoff', { username: 'siswa1', target: { type: 'topic', topic_id: 999 } });
    expect(res.status).toBe(400);
    expect(storeHandoffTokenMock).not.toHaveBeenCalled();
  });

  it('issues a topic handoff bound to that topic', async () => {
    findTopicMock.mockResolvedValue({ id: 7 });
    const { simakInternalRoutes } = await import('@/routes/simak-internal');
    const app = simakInternalRoutes({} as never, SECRET);
    const res = await post(app, '/handoff', { username: 'siswa1', target: { type: 'topic', topic_id: 7, subject_id: 3 } });
    expect(res.status).toBe(200);
    const stored = storeHandoffTokenMock.mock.calls[0]?.[1] as { target: unknown };
    expect(stored.target).toEqual({ type: 'topic', topic_id: 7, subject_id: 3 });
  });
});

describe('simakHandoffRedeemRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findActiveUserMock.mockResolvedValue({ username: 'siswa1', is_demo: 0 });
    createTokenMock.mockReturnValue('session-token-1');
    createDemoTokenMock.mockReturnValue('demo-session-token');
  });

  it('redeems once into a normal RUAS session toward the dashboard, then refuses the second use', async () => {
    redeemHandoffTokenMock.mockResolvedValueOnce({ username: 'siswa1', target: { type: 'dashboard' } });
    redeemHandoffTokenMock.mockResolvedValue(null);
    const { simakHandoffRedeemRoutes } = await import('@/routes/simak-internal');
    const app = simakHandoffRedeemRoutes({} as never);

    const first = await app.request('http://localhost/masuk-simak/token-sekali-pakai');
    expect(first.status).toBe(302);
    expect(first.headers.get('location')).toBe('/#simak-sesi=session-token-1');
    expect(createTokenMock).toHaveBeenCalledWith('siswa1');

    const second = await app.request('http://localhost/masuk-simak/token-sekali-pakai');
    expect(second.status).toBe(302);
    expect(second.headers.get('location')).toBe('/auth');
  });

  it('redirects topic targets straight to the quiz page', async () => {
    redeemHandoffTokenMock.mockResolvedValue({ username: 'siswa1', target: { type: 'topic', topic_id: 7, subject_id: 3 } });
    const { simakHandoffRedeemRoutes } = await import('@/routes/simak-internal');
    const app = simakHandoffRedeemRoutes({} as never);
    const res = await app.request('http://localhost/masuk-simak/token-topik');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/quiz/7?subject_id=3#simak-sesi=session-token-1');
  });

  it('sends expired or unknown tokens to the plain login page without technical detail', async () => {
    redeemHandoffTokenMock.mockResolvedValue(null);
    const { simakHandoffRedeemRoutes } = await import('@/routes/simak-internal');
    const app = simakHandoffRedeemRoutes({} as never);
    const res = await app.request('http://localhost/masuk-simak/token-kedaluwarsa');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/auth');
    expect(createTokenMock).not.toHaveBeenCalled();
  });

  it('never lets a url parameter override the token username', async () => {
    redeemHandoffTokenMock.mockResolvedValue({ username: 'siswa1', target: { type: 'dashboard' } });
    const { simakHandoffRedeemRoutes } = await import('@/routes/simak-internal');
    const app = simakHandoffRedeemRoutes({} as never);
    const res = await app.request('http://localhost/masuk-simak/token-bagus?username=orang-lain');
    expect(res.status).toBe(302);
    expect(createTokenMock).toHaveBeenCalledWith('siswa1');
    expect(createTokenMock).not.toHaveBeenCalledWith('orang-lain');
  });
});
