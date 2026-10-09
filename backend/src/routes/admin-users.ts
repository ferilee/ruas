import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema/users';
import { subjects } from '@/db/schema/subjects';
import type { Pool } from '@/db/connection';
import {
  createUser,
  createUserDb,
  deleteUser,
  findUserById,
  listUsers,
  toPublicUser,
  updateUser,
  assignSubjectToUsers,
} from '@/services/user-service';

const roleSchema = z.enum(['admin', 'editor', 'participant']);
const createUserSchema = z.object({
  username: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._@+-]+$/, 'Username mengandung karakter yang tidak didukung.'),
  password: z.string().min(1).max(200),
  display_name: z.string().trim().min(1).max(150),
  subject_id: z.preprocess((value) => (value === '' || value === undefined ? null : value), z.coerce.number().int().positive().nullable()).default(null),
  role: roleSchema,
  active: z.boolean().default(true),
});
const updateUserSchema = createUserSchema.extend({ password: z.string().max(200).optional() });
const importRequestSchema = z.object({
  data: z.unknown(),
  mode: z.enum(['insert', 'upsert']).default('insert'),
  dry_run: z.boolean().default(false),
});
const bulkSubjectSchema = z.object({
  user_ids: z.array(z.coerce.number().int().positive()).min(1).max(500),
  subject_id: z.preprocess((value) => (value === '' || value === undefined || value === null ? null : value), z.coerce.number().int().positive().nullable()),
});

type ImportRow = z.infer<typeof createUserSchema>;

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  return !['false', '0', 'no', 'tidak', 'inactive', 'nonaktif'].includes(String(value ?? '').trim().toLowerCase());
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);

  const [header, ...body] = rows;
  if (!header || header.length === 0) return [];
  return body.map((values) => Object.fromEntries(header.map((key, index) => [key.trim(), values[index] ?? ''])));
}

function parseImportRows(data: unknown): unknown[] {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return parseImportRows(parsed);
    } catch {
      return parseCsv(trimmed);
    }
  }
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'users' in data) {
    const usersData = (data as { users?: unknown }).users;
    return Array.isArray(usersData) ? usersData : [];
  }
  return [];
}

function validateImportRow(value: unknown) {
  if (!value || typeof value !== 'object') return createUserSchema.safeParse(value);
  const row = value as Record<string, unknown>;
  return createUserSchema.safeParse({
    username: row.username,
    password: row.password,
    display_name: row.display_name || row.name || row.username,
    subject_id: row.subject_id,
    role: row.role || 'participant',
    active: parseBoolean(row.active),
  });
}

async function subjectExists(db: ReturnType<typeof createUserDb>, subjectId: number) {
  const [subject] = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.id, subjectId)).limit(1);
  return Boolean(subject);
}

export function adminUserRoutes(pool: Pool) {
  const db = createUserDb(pool);
  const app = new Hono();

  app.get('/', async (c) => c.json({ users: await listUsers(db, c.req.query('search')) }));

  app.post('/', async (c) => {
    const parsed = createUserSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: 'Data pengguna tidak valid.' }, 400);
    if (parsed.data.subject_id && !(await subjectExists(db, parsed.data.subject_id))) return c.json({ error: 'invalid_reference', message: 'Mata pelajaran tidak ditemukan.' }, 400);
    const [duplicate] = await db.select({ id: users.id }).from(users).where(eq(users.username, parsed.data.username)).limit(1);
    if (duplicate) {
      return c.json({ error: 'duplicate_username', message: 'Username sudah digunakan.' }, 409);
    }
    const user = await createUser(db, parsed.data);
    return c.json({ user: user ? toPublicUser(user) : null }, 201);
  });

  app.post('/import', async (c) => {
    const parsedRequest = importRequestSchema.safeParse(await c.req.json());
    if (!parsedRequest.success) return c.json({ error: 'invalid_body', message: 'Data import pengguna tidak valid.' }, 400);

    const rows = parseImportRows(parsedRequest.data.data);
    const summary = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };
    const validRows: Array<{ row: ImportRow; line: number }> = [];
    for (const [index, value] of rows.entries()) {
      const parsed = validateImportRow(value);
      if (!parsed.success) {
        summary.errors.push(`Baris ${index + 1}: username, password, display_name, dan role wajib valid.`);
      } else if (parsed.data.subject_id && !(await subjectExists(db, parsed.data.subject_id))) {
        summary.errors.push(`Baris ${index + 1}: mata pelajaran tidak ditemukan.`);
      } else {
        validRows.push({ row: parsed.data, line: index + 1 });
      }
    }

    for (const { row, line } of validRows) {
      const [existing] = await db.select().from(users).where(eq(users.username, row.username)).limit(1);
      if (existing) {
        if (parsedRequest.data.mode === 'upsert') summary.updated += 1;
        else {
          summary.skipped += 1;
          summary.errors.push(`Baris ${line}: username ${row.username} sudah ada.`);
        }
      } else {
        summary.inserted += 1;
      }
    }

    if (!parsedRequest.data.dry_run) {
      for (const { row } of validRows) {
        const [existing] = await db.select().from(users).where(eq(users.username, row.username)).limit(1);
        if (existing && parsedRequest.data.mode === 'upsert') {
          await updateUser(db, existing.id, row);
        } else if (!existing) {
          await createUser(db, row);
        }
      }
    }

    return c.json({ summary });
  });

  app.patch('/bulk-subject', async (c) => {
    const parsed = bulkSubjectSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: 'Pilihan pengguna atau mata pelajaran tidak valid.' }, 400);
    if (parsed.data.subject_id !== null && !(await subjectExists(db, parsed.data.subject_id))) {
      return c.json({ error: 'invalid_reference', message: 'Mata pelajaran tidak ditemukan.' }, 400);
    }

    const updated = await assignSubjectToUsers(db, parsed.data.user_ids, parsed.data.subject_id);
    return c.json({ updated });
  });

  app.put('/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const parsed = updateUserSchema.safeParse(await c.req.json());
    if (!id || !parsed.success) return c.json({ error: 'invalid_body', message: 'Data pengguna tidak valid.' }, 400);
    if (parsed.data.subject_id && !(await subjectExists(db, parsed.data.subject_id))) return c.json({ error: 'invalid_reference', message: 'Mata pelajaran tidak ditemukan.' }, 400);
    const existing = await findUserById(db, id);
    if (!existing) return c.json({ error: 'not_found', message: 'Pengguna tidak ditemukan.' }, 404);
    const duplicate = await db.select({ id: users.id }).from(users).where(eq(users.username, parsed.data.username)).limit(1);
    if (duplicate[0] && duplicate[0].id !== id) return c.json({ error: 'duplicate_username', message: 'Username sudah digunakan.' }, 409);
    const user = await updateUser(db, id, parsed.data);
    return c.json({ user: user ? toPublicUser(user) : null });
  });

  app.delete('/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid_param', message: 'ID pengguna tidak valid.' }, 400);
    if (!(await findUserById(db, id))) return c.json({ error: 'not_found', message: 'Pengguna tidak ditemukan.' }, 404);
    await deleteUser(db, id);
    return c.json({ deleted: true });
  });

  return app;
}
