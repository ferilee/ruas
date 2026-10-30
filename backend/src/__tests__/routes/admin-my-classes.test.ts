import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { educationClasses } from '@/db/schema/education-classes';
import { subjects } from '@/db/schema/subjects';
import { userClasses } from '@/db/schema/user-classes';
import { users } from '@/db/schema/users';
import type { AdminSession } from '@/lib/admin-auth-store';

const { drizzleMock } = vi.hoisted(() => ({
  drizzleMock: vi.fn(),
}));

vi.mock('drizzle-orm/mysql2', () => ({
  drizzle: drizzleMock,
}));

const teacherRow = {
  id: 42,
  username: 'guru.satu',
  password_hash: 'hash',
  display_name: 'Guru Satu',
  class_id: 3,
  subject_id: 7,
  role: 'editor',
  active: 1,
  is_demo: 0,
  must_change_password: 0,
  created_by: null,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
};

const classRows = [
  { id: 3, slug: '11-tkj-a', label: 'Kelas 11 TKJ A', academic_year: '2026/2027' },
  { id: 5, slug: '11-tkj-b', label: 'Kelas 11 TKJ B', academic_year: '2026/2027' },
  { id: 9, slug: '10-rpl', label: 'Kelas 10 RPL', academic_year: '2026/2027' },
];

function selectChain(rows: unknown[]) {
  const resolved = Promise.resolve(rows);
  return {
    limit: vi.fn(async () => rows),
    orderBy: vi.fn(async () => rows),
    then: resolved.then.bind(resolved),
    catch: resolved.catch.bind(resolved),
  };
}

function createFakeDb({ mappingClassIds = [3], classesExist = true, studentClassIds = [] as number[] }: { mappingClassIds?: number[]; classesExist?: boolean; studentClassIds?: number[] } = {}) {
  const inserted: Array<{ table: unknown; values: unknown }> = [];
  const deletedTables: unknown[] = [];
  const mappingRows = mappingClassIds.map((classId) => ({
    user_id: 42,
    class_id: classId,
    source: 'admin' as const,
    created_by: 'env-admin',
    created_at: new Date('2026-01-01T00:00:00Z'),
  }));
  const db = {
    select: vi.fn((fields?: unknown) => ({
      from: vi.fn((table: unknown) => ({
        where: vi.fn(() => {
          if (table === userClasses) {
            return selectChain(fields && 'class_id' in (fields as Record<string, unknown>) && !('user_id' in (fields as Record<string, unknown>))
              ? mappingRows.map((row) => ({ class_id: row.class_id }))
              : mappingRows);
          }
          if (table === educationClasses) return selectChain(classesExist ? [{ id: 5 }] : []);
          if (table === subjects) return selectChain([]);
          // select() tanpa fields = pencarian akun guru; select({ class_id })
          // = query hitung peserta per kelas (countParticipantsByClassId).
          if (table === users) return selectChain(fields === undefined ? [teacherRow] : studentClassIds.map((classId) => ({ class_id: classId })));
          return selectChain([]);
        }),
        orderBy: vi.fn(async () => classRows),
      })),
    })),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn(async (values: unknown) => {
        inserted.push({ table, values });
        return [{ insertId: 1 }];
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => [{ affectedRows: 1 }]) })),
    })),
    delete: vi.fn((table: unknown) => ({
      where: vi.fn(async () => {
        deletedTables.push(table);
        return [{ affectedRows: 1 }];
      }),
    })),
  };
  return { db, inserted, deletedTables };
}

function teacherSession(): AdminSession {
  return { username: 'guru.satu', display_name: 'Guru Satu', role: 'editor', subject_id: 7, class_id: 3, class_ids: [3] };
}

async function buildApp(session: AdminSession | null) {
  const { adminMyClassesRoutes } = await import('@/routes/admin-my-classes');
  const app = new Hono();
  app.use('*', async (c, next) => {
    if (session) c.set('adminSession' as never, session as never);
    await next();
  });
  app.route('/', adminMyClassesRoutes({} as never));
  return app;
}

describe('adminMyClassesRoutes (self-pick guru)', () => {
  beforeEach(() => {
    drizzleMock.mockReset();
  });

  it('lists master classes and the teacher own mappings', async () => {
    const { db } = createFakeDb();
    drizzleMock.mockReturnValue(db);
    const app = await buildApp(teacherSession());

    const response = await app.request('http://localhost/');
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.classes).toHaveLength(3);
    expect(payload.mappings).toEqual([
      expect.objectContaining({ class_id: 3, source: 'admin' }),
    ]);
  });

  it('reports student_count per class from participant class bindings, with 0 for empty classes', async () => {
    // Dua siswa di kelas 3, satu di kelas 9, kelas 5 kosong. Baris class_id
    // null (peserta belum ditetapkan) tidak boleh terhitung ke kelas mana pun.
    const { db } = createFakeDb({ studentClassIds: [3, 3, 9] });
    drizzleMock.mockReturnValue(db);
    const app = await buildApp(teacherSession());

    const response = await app.request('http://localhost/');
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.classes).toEqual([
      expect.objectContaining({ id: 3, student_count: 2 }),
      expect.objectContaining({ id: 5, student_count: 0 }),
      expect.objectContaining({ id: 9, student_count: 1 }),
    ]);
  });

  it('adds an existing master class as a self mapping for the teacher himself', async () => {
    const { db, inserted } = createFakeDb();
    drizzleMock.mockReturnValue(db);
    const app = await buildApp(teacherSession());

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // user_id pada body harus diabaikan: petaan selalu untuk diri sendiri.
      body: JSON.stringify({ class_id: 5, user_id: 999 }),
    });

    expect(response.status).toBe(200);
    const mappingInsert = inserted.find((entry) => entry.table === userClasses);
    expect(mappingInsert?.values).toEqual(expect.objectContaining({ user_id: 42, class_id: 5, source: 'self', created_by: 'guru.satu' }));
  });

  it('rejects adding an unknown class with 400 and writes nothing', async () => {
    const { db, inserted } = createFakeDb({ classesExist: false });
    drizzleMock.mockReturnValue(db);
    const app = await buildApp(teacherSession());

    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_id: 99 }),
    });

    expect(response.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it('removes the teacher own mapping', async () => {
    const { db, deletedTables } = createFakeDb({ mappingClassIds: [3, 5] });
    drizzleMock.mockReturnValue(db);
    const app = await buildApp(teacherSession());

    const response = await app.request('http://localhost/5', { method: 'DELETE' });
    expect(response.status).toBe(200);
    expect(deletedTables).toContain(userClasses);
  });

  it('rejects admin sessions and missing sessions', async () => {
    const { db } = createFakeDb();
    drizzleMock.mockReturnValue(db);
    const admin: AdminSession = { username: 'admin', display_name: 'Admin', role: 'admin', subject_id: null, class_id: null, class_ids: [] };
    const adminApp = await buildApp(admin);
    expect((await adminApp.request('http://localhost/')).status).toBe(403);

    const anonymousApp = await buildApp(null);
    expect((await anonymousApp.request('http://localhost/')).status).toBe(403);
  });
});
