import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { educationClasses } from '@/db/schema/education-classes';
import { users } from '@/db/schema/users';
import { subjects } from '@/db/schema/subjects';
import type { Pool } from '@/db/connection';
import {
  createUser,
  createUserDb,
  deleteUser,
  deleteAllParticipants,
  countParticipantUsers,
  findUserById,
  listUsers,
  listUserIds,
  resetUserPassword,
  toPublicUser,
  updateUser,
  assignSubjectToUsers,
  assignClassToUsers,
  type ParticipantScope,
  type UserInput,
} from '@/services/user-service';
import { revokeTokensForUsername } from '@/lib/auth-store';
import { participantScopeForAdmin, userMatchesAdminScope } from '@/lib/admin-scope';

const roleSchema = z.enum(['admin', 'editor', 'participant']);
const userFieldsSchema = z.object({
  username: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._@+-]+$/, 'Username mengandung karakter yang tidak didukung.'),
  password: z.string().min(1).max(200),
  display_name: z.string().trim().min(1).max(150),
  class_id: z.preprocess((value) => (value === '' || value === undefined ? null : value), z.coerce.number().int().positive().nullable()).default(null),
  subject_id: z.preprocess((value) => (value === '' || value === undefined ? null : value), z.coerce.number().int().positive().nullable()).default(null),
  role: roleSchema,
  active: z.boolean().default(true),
  is_demo: z.boolean().default(false),
});
function validateDemoRole(value: { is_demo: boolean; role: z.infer<typeof roleSchema> }, context: z.RefinementCtx) {
  if (value.is_demo && value.role !== 'participant') {
    context.addIssue({ code: 'custom', path: ['is_demo'], message: 'Akun demo harus memiliki peran peserta.' });
  }
}
function validateEditorAssignment(value: { role: z.infer<typeof roleSchema>; subject_id: number | null }, context: z.RefinementCtx) {
  if (value.role === 'editor' && value.subject_id === null) {
    context.addIssue({ code: 'custom', path: ['subject_id'], message: 'Akun guru wajib diberi mata pelajaran.' });
  }
}
const createUserSchema = userFieldsSchema.superRefine(validateDemoRole).superRefine(validateEditorAssignment);
const updateUserSchema = userFieldsSchema.extend({ password: z.string().max(200).optional() }).superRefine(validateDemoRole).superRefine(validateEditorAssignment);
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
    class_id: row.class_id,
    subject_id: row.subject_id,
    role: row.role || 'participant',
    active: parseBoolean(row.active),
    is_demo: row.is_demo === undefined || row.is_demo === '' ? false : parseBoolean(row.is_demo),
  });
}

async function subjectExists(db: ReturnType<typeof createUserDb>, subjectId: number) {
  const [subject] = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.id, subjectId)).limit(1);
  return Boolean(subject);
}

async function classExists(db: ReturnType<typeof createUserDb>, classId: number) {
  const [educationClass] = await db.select({ id: educationClasses.id }).from(educationClasses).where(eq(educationClasses.id, classId)).limit(1);
  return Boolean(educationClass);
}

async function findClassIdByCode(db: ReturnType<typeof createUserDb>, code: string) {
  const [educationClass] = await db.select({ id: educationClasses.id }).from(educationClasses).where(eq(educationClasses.slug, code)).limit(1);
  return educationClass?.id ?? null;
}

export function adminUserRoutes(pool: Pool) {
  const db = createUserDb(pool);
  const app = new Hono();

  function session(c: Context) {
    return c.get('adminSession');
  }

  function editorScope(c: Context): ParticipantScope | null {
    const current = session(c);
    return current?.role === 'editor' ? participantScopeForAdmin(current) : null;
  }

  function editorMessage(c: Context) {
    return session(c)?.subject_id === null
      ? 'Akun guru belum diberi mata pelajaran.'
      : 'Siswa berada di luar kelas atau mata pelajaran yang ditetapkan.';
  }

  function scopeInput(c: Context, input: UserInput): { input?: UserInput; message?: string } {
    const current = session(c);
    if (!current || current.role === 'admin') return { input };
    if (current.subject_id === null) return { message: 'Akun guru belum diberi mata pelajaran.' };
    if (input.role !== 'participant' || input.is_demo) return { message: 'Guru hanya dapat membuat akun Peserta non-demo.' };
    const classId = current.class_id ?? input.class_id;
    if (classId === null || (current.class_id !== null && input.class_id !== null && input.class_id !== current.class_id)) {
      return { message: editorMessage(c) };
    }
    return { input: { ...input, role: 'participant' as const, is_demo: false, subject_id: current.subject_id, class_id: classId } };
  }

  async function findScopedUser(c: Context, id: number) {
    const existing = await findUserById(db, id);
    if (!existing) return { response: c.json({ error: 'not_found', message: 'Pengguna tidak ditemukan.' }, 404) };
    if (!userMatchesAdminScope(session(c), existing)) {
      return { response: c.json({ error: 'admin_forbidden', message: 'Pengguna berada di luar penetapan akun ini.' }, 403) };
    }
    return { existing };
  }

  app.get('/', async (c) => {
    const current = session(c);
    if (current?.role === 'editor' && !editorScope(c)) return c.json({ users: [] });
    return c.json({ users: await listUsers(db, c.req.query('search'), editorScope(c) ?? undefined) });
  });

  app.get('/participants/count', async (c) => {
    const current = session(c);
    if (current?.role === 'editor' && !editorScope(c)) return c.json({ count: 0 });
    return c.json({ count: await countParticipantUsers(db, editorScope(c) ?? undefined) });
  });

  app.delete('/participants', async (c) => {
    if (session(c)?.role === 'editor') return c.json({ error: 'admin_forbidden', message: 'Menghapus seluruh peserta hanya dapat dilakukan Admin.' }, 403);
    let body: unknown = {};
    try {
      body = await c.req.json();
    } catch {
      // The validation response below is enough when the request has no JSON body.
    }
    const parsed = z.object({ confirmation: z.literal('HAPUS SEMUA PESERTA') }).safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'confirmation_required', message: 'Ketik HAPUS SEMUA PESERTA untuk menghapus seluruh akun peserta.' }, 400);
    }

    const deleted = await deleteAllParticipants(db);
    return c.json({ deleted });
  });

  app.post('/', async (c) => {
    const parsed = createUserSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: 'Data pengguna tidak valid.' }, 400);
    const scoped = scopeInput(c, parsed.data);
    if (!scoped.input) return c.json({ error: 'admin_forbidden', message: scoped.message }, 403);
    if (scoped.input.class_id && !(await classExists(db, scoped.input.class_id))) return c.json({ error: 'invalid_reference', message: 'Kelas tidak ditemukan.' }, 400);
    if (scoped.input.subject_id && !(await subjectExists(db, scoped.input.subject_id))) return c.json({ error: 'invalid_reference', message: 'Mata pelajaran tidak ditemukan.' }, 400);
    const [duplicate] = await db.select({ id: users.id }).from(users).where(eq(users.username, scoped.input.username)).limit(1);
    if (duplicate) {
      return c.json({ error: 'duplicate_username', message: 'Username sudah digunakan.' }, 409);
    }
    const user = await createUser(db, scoped.input);
    return c.json({ user: user ? toPublicUser(user) : null }, 201);
  });

  app.post('/import', async (c) => {
    const parsedRequest = importRequestSchema.safeParse(await c.req.json());
    if (!parsedRequest.success) return c.json({ error: 'invalid_body', message: 'Data import pengguna tidak valid.' }, 400);

    const rows = parseImportRows(parsedRequest.data.data);
    const summary = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };
    const validRows: Array<{ row: ImportRow; line: number }> = [];
    for (const [index, value] of rows.entries()) {
      const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
      const classCode = String(raw.class_code ?? '').trim();
      const classId = raw.class_id || classCode ? raw.class_id || await findClassIdByCode(db, classCode) : null;
      if (classCode && !classId) {
        summary.errors.push(`Baris ${index + 1}: kode kelas ${classCode} tidak ditemukan.`);
        continue;
      }
      const parsed = validateImportRow({ ...raw, class_id: classId });
      if (!parsed.success) {
        summary.errors.push(`Baris ${index + 1}: username, password, display_name, dan role wajib valid.`);
      } else if (parsed.data.class_id && !(await classExists(db, parsed.data.class_id))) {
        summary.errors.push(`Baris ${index + 1}: kelas dengan ID atau kode tersebut tidak ditemukan.`);
      } else if (parsed.data.subject_id && !(await subjectExists(db, parsed.data.subject_id))) {
        summary.errors.push(`Baris ${index + 1}: mata pelajaran tidak ditemukan.`);
      } else {
        const scoped = scopeInput(c, parsed.data);
        if (!scoped.input) summary.errors.push(`Baris ${index + 1}: ${scoped.message}`);
        else if (!scoped.input.password) summary.errors.push(`Baris ${index + 1}: password wajib diisi.`);
        else validRows.push({ row: scoped.input as ImportRow, line: index + 1 });
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

  app.post('/:id/reset-password', async (c) => {
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid_param', message: 'ID pengguna tidak valid.' }, 400);

    const scoped = await findScopedUser(c, id);
    if (scoped.response) return scoped.response;
    const existing = scoped.existing;
    if (!existing) return c.json({ error: 'not_found', message: 'Pengguna tidak ditemukan.' }, 404);
    const result = await resetUserPassword(db, id);
    if (result && 'demoAccount' in result) {
      return c.json({ error: 'demo_account', message: 'Sandi akun demo tidak dapat di-reset.' }, 400);
    }
    revokeTokensForUsername(existing.username);
    return c.json({ user: result?.user ? toPublicUser(result.user) : null, temporary_password: result?.temporaryPassword });
  });

  app.patch('/bulk-subject', async (c) => {
    if (session(c)?.role === 'editor') return c.json({ error: 'admin_forbidden', message: 'Penetapan massal hanya dapat dilakukan Admin.' }, 403);
    const parsed = bulkSubjectSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: 'Pilihan pengguna atau mata pelajaran tidak valid.' }, 400);
    if (parsed.data.subject_id !== null && !(await subjectExists(db, parsed.data.subject_id))) {
      return c.json({ error: 'invalid_reference', message: 'Mata pelajaran tidak ditemukan.' }, 400);
    }

    const updated = await assignSubjectToUsers(db, parsed.data.user_ids, parsed.data.subject_id);
    return c.json({ updated });
  });

  app.patch('/bulk-class', async (c) => {
    if (session(c)?.role === 'editor') return c.json({ error: 'admin_forbidden', message: 'Penetapan massal hanya dapat dilakukan Admin.' }, 403);
    const parsed = z.object({
      user_ids: z.array(z.coerce.number().int().positive()).min(1).max(500).optional(),
      search: z.string().max(100).optional(),
      class_id: z.preprocess((value) => (value === '' || value === undefined || value === null ? null : value), z.coerce.number().int().positive().nullable()),
    }).refine((value) => Boolean(value.user_ids?.length) || value.search !== undefined, 'Pilih pengguna atau gunakan pencarian.').safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: 'Pilihan pengguna atau kelas tidak valid.' }, 400);
    if (parsed.data.class_id !== null && !(await classExists(db, parsed.data.class_id))) {
      return c.json({ error: 'invalid_reference', message: 'Kelas tidak ditemukan.' }, 400);
    }

    const userIds = parsed.data.search !== undefined ? await listUserIds(db, parsed.data.search) : parsed.data.user_ids ?? [];
    if (userIds.length === 0) return c.json({ updated: 0 });
    const updated = await assignClassToUsers(db, userIds, parsed.data.class_id);
    return c.json({ updated });
  });

  app.put('/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const parsed = updateUserSchema.safeParse(await c.req.json());
    if (!id || !parsed.success) return c.json({ error: 'invalid_body', message: 'Data pengguna tidak valid.' }, 400);
    const scopedExisting = await findScopedUser(c, id);
    if (scopedExisting.response) return scopedExisting.response;
    const existing = scopedExisting.existing;
    if (!existing) return c.json({ error: 'not_found', message: 'Pengguna tidak ditemukan.' }, 404);
    const scoped = scopeInput(c, parsed.data);
    if (!scoped.input) return c.json({ error: 'admin_forbidden', message: scoped.message }, 403);
    if (scoped.input.class_id && !(await classExists(db, scoped.input.class_id))) return c.json({ error: 'invalid_reference', message: 'Kelas tidak ditemukan.' }, 400);
    if (scoped.input.subject_id && !(await subjectExists(db, scoped.input.subject_id))) return c.json({ error: 'invalid_reference', message: 'Mata pelajaran tidak ditemukan.' }, 400);
    const duplicate = await db.select({ id: users.id }).from(users).where(eq(users.username, scoped.input.username)).limit(1);
    if (duplicate[0] && duplicate[0].id !== id) return c.json({ error: 'duplicate_username', message: 'Username sudah digunakan.' }, 409);
    const user = await updateUser(db, id, scoped.input);
    return c.json({ user: user ? toPublicUser(user) : null });
  });

  app.delete('/:id', async (c) => {
    if (session(c)?.role === 'editor') return c.json({ error: 'admin_forbidden', message: 'Menghapus pengguna hanya dapat dilakukan Admin.' }, 403);
    const id = parseId(c.req.param('id'));
    if (!id) return c.json({ error: 'invalid_param', message: 'ID pengguna tidak valid.' }, 400);
    if (!(await findUserById(db, id))) return c.json({ error: 'not_found', message: 'Pengguna tidak ditemukan.' }, 404);
    await deleteUser(db, id);
    return c.json({ deleted: true });
  });

  return app;
}
