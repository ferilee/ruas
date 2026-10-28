import { beforeEach, describe, expect, it, vi } from 'vitest';
import { educationClasses } from '@/db/schema/education-classes';
import { subjects } from '@/db/schema/subjects';
import { userClasses } from '@/db/schema/user-classes';
import { users } from '@/db/schema/users';

const { drizzleMock } = vi.hoisted(() => ({
  drizzleMock: vi.fn(),
}));

vi.mock('drizzle-orm/mysql2', () => ({
  drizzle: drizzleMock,
}));

const teacherRow = {
  id: 42,
  username: 'guru.baru',
  password_hash: 'hash',
  display_name: 'Guru Baru',
  class_id: 3,
  subject_id: 7,
  role: 'editor',
  active: 1,
  is_demo: 0,
  must_change_password: 1,
  created_by: null,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
};

function selectChain(rows: unknown[]) {
  const resolved = Promise.resolve(rows);
  return {
    limit: vi.fn(async () => rows),
    then: resolved.then.bind(resolved),
    catch: resolved.catch.bind(resolved),
  };
}

function createFakeDb({ classesExist = true } = {}) {
  const inserted: Array<{ table: unknown; values: unknown }> = [];
  const deletedTables: unknown[] = [];
  const mappingRows = [
    { user_id: 42, class_id: 3, source: 'admin' as const, created_by: 'env-admin', created_at: new Date('2026-01-01T00:00:00Z') },
    { user_id: 42, class_id: 5, source: 'admin' as const, created_by: 'env-admin', created_at: new Date('2026-01-01T00:00:00Z') },
  ];
  const db = {
    select: vi.fn((fields?: unknown) => ({
      from: vi.fn((table: unknown) => ({
        where: vi.fn(() => {
          if (table === userClasses) return selectChain(mappingRows);
          if (table === educationClasses) return selectChain(classesExist ? [{ id: 3 }] : []);
          if (table === subjects) return selectChain([{ id: 7 }]);
          if (table === users) return selectChain(fields === undefined ? [teacherRow] : []);
          return selectChain([]);
        }),
      })),
    })),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn(async (values: unknown) => {
        inserted.push({ table, values });
        return [{ insertId: 42 }];
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

const editorBody = {
  username: 'guru.baru',
  password: 'rahasia-sekali',
  display_name: 'Guru Baru',
  class_id: null,
  subject_id: 7,
  role: 'editor',
  active: true,
  is_demo: false,
};

describe('adminUserRoutes teacher class mapping (class_ids)', () => {
  beforeEach(() => {
    drizzleMock.mockReset();
  });

  it('stores deduped class_ids into user_classes when creating a teacher', async () => {
    const { db, inserted } = createFakeDb();
    drizzleMock.mockReturnValue(db);

    const { adminUserRoutes } = await import('@/routes/admin-users');
    const app = adminUserRoutes({} as never);
    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editorBody, class_ids: [3, 5, 3] }),
    });

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.user.class_ids).toEqual([3, 5]);
    expect(payload.user.class_mappings).toHaveLength(2);

    const mappingInsert = inserted.find((entry) => entry.table === userClasses);
    expect(mappingInsert).toBeDefined();
    const rows = mappingInsert?.values as Array<{ user_id: number; class_id: number; source: string }>;
    expect(rows.map((row) => row.class_id)).toEqual([3, 5]);
    expect(rows.every((row) => row.user_id === 42 && row.source === 'admin')).toBe(true);

    // class_id tunggal lama disinkronkan ke kelas pertama.
    const userInsert = inserted.find((entry) => entry.table === users);
    expect((userInsert?.values as { class_id: number | null }).class_id).toBe(3);
  });

  it('rejects class_ids containing an unknown class without writing anything', async () => {
    const { db, inserted } = createFakeDb({ classesExist: false });
    drizzleMock.mockReturnValue(db);

    const { adminUserRoutes } = await import('@/routes/admin-users');
    const app = adminUserRoutes({} as never);
    const response = await app.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editorBody, class_ids: [99] }),
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.fields?.class_ids).toBeTruthy();
    expect(inserted).toHaveLength(0);
  });

  it('admin update can revoke a self-picked class by omitting it from class_ids', async () => {
    const { db, inserted, deletedTables } = createFakeDb();
    drizzleMock.mockReturnValue(db);

    const { adminUserRoutes } = await import('@/routes/admin-users');
    const app = adminUserRoutes({} as never);
    // Guru sebelumnya memilih sendiri kelas 5; admin menyimpannya keluar dari
    // daftar saat memperbarui pengguna, sehingga petaan self itu tercabut.
    const response = await app.request('http://localhost/42', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editorBody, class_ids: [3] }),
    });

    expect(response.status).toBe(200);
    expect(deletedTables).toContain(userClasses);
    const mappingInsert = inserted.find((entry) => entry.table === userClasses);
    const rows = mappingInsert?.values as Array<{ class_id: number }>;
    expect(rows.map((row) => row.class_id)).toEqual([3]);
  });

  it('replaces the whole mapping on update, revoking classes not listed anymore', async () => {
    const { db, inserted, deletedTables } = createFakeDb();
    drizzleMock.mockReturnValue(db);

    const { adminUserRoutes } = await import('@/routes/admin-users');
    const app = adminUserRoutes({} as never);
    const response = await app.request('http://localhost/42', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editorBody, class_ids: [5] }),
    });

    expect(response.status).toBe(200);
    expect(deletedTables).toContain(userClasses);
    const mappingInsert = inserted.find((entry) => entry.table === userClasses);
    const rows = mappingInsert?.values as Array<{ class_id: number }>;
    expect(rows.map((row) => row.class_id)).toEqual([5]);
  });
});
