import { and, asc, eq, inArray, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { randomBytes } from 'node:crypto';
import { educationClasses } from '@/db/schema/education-classes';
import { users } from '@/db/schema/users';
import { userClasses } from '@/db/schema/user-classes';
import { subjects } from '@/db/schema/subjects';
import type { Pool } from '@/db/connection';
import { hashPassword, verifyPassword } from '@/lib/password';

type UserDb = ReturnType<typeof drizzle>;

export type UserRole = 'admin' | 'editor' | 'participant';

export interface ParticipantScope {
  subject_id: number;
  class_ids: number[];
  owner_username?: string;
}

export type UserClassSource = 'admin' | 'self';

export interface UserClassMapping {
  class_id: number;
  source: UserClassSource;
  created_by: string | null;
  created_at: Date | string | null;
}

export interface UserInput {
  username: string;
  password?: string;
  display_name: string;
  class_id: number | null;
  class_ids?: number[];
  subject_id: number | null;
  role: UserRole;
  active: boolean;
  is_demo: boolean;
}

export function createUserDb(pool: Pool) {
  return drizzle(pool, { schema: { educationClasses, subjects, users, userClasses }, mode: 'default' });
}

export function toPublicUser(user: typeof users.$inferSelect, classLabel?: string | null, classMappings?: UserClassMapping[]) {
  // Untuk guru/admin, class_ids berasal dari relasi user_classes. Bila relasi
  // kosong (akun lama sebelum migrasi data), class_id tunggal lama menjadi
  // petaan tunggal agar perilaku lama tetap berjalan.
  const fallbackMappings: UserClassMapping[] = classMappings === undefined && user.role !== 'participant' && user.class_id
    ? [{ class_id: user.class_id, source: 'admin', created_by: null, created_at: null }]
    : [];
  const mappings = classMappings ?? fallbackMappings;
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    class_id: user.class_id,
    class_label: classLabel ?? null,
    class_ids: mappings.map((mapping) => mapping.class_id),
    class_mappings: mappings,
    subject_id: user.subject_id,
    role: user.role,
    active: Boolean(user.active),
    is_demo: Boolean(user.is_demo),
    created_by: user.created_by,
    must_change_password: Boolean(user.must_change_password),
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function userSearchCondition(search?: string) {
  const normalizedSearch = search?.trim();
  return normalizedSearch
    ? or(
        like(users.username, `%${normalizedSearch}%`),
        like(users.display_name, `%${normalizedSearch}%`),
        like(educationClasses.label, `%${normalizedSearch}%`),
        like(educationClasses.slug, `%${normalizedSearch}%`),
        like(educationClasses.program, `%${normalizedSearch}%`),
        like(educationClasses.section, `%${normalizedSearch}%`),
        like(educationClasses.academic_year, `%${normalizedSearch}%`),
      )
    : undefined;
}

function userWhere(search?: string, scope?: ParticipantScope) {
  const assignedScope = scope
    ? and(
        eq(users.subject_id, scope.subject_id),
        scope.class_ids.length > 0 ? inArray(users.class_id, scope.class_ids) : undefined,
      )
    : undefined;
  const conditions = [
    userSearchCondition(search),
    scope ? and(eq(users.role, 'participant'), scope.owner_username ? or(eq(users.created_by, scope.owner_username), assignedScope) : assignedScope) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listUsers(db: UserDb, search?: string, scope?: ParticipantScope) {
  const rows = await db
    .select({ user: users, class_label: educationClasses.label })
    .from(users)
    .leftJoin(educationClasses, eq(users.class_id, educationClasses.id))
    .where(userWhere(search, scope))
    .orderBy(asc(users.display_name), asc(users.id));

  return rows.map(({ user, class_label }) => toPublicUser(user, class_label));
}

export async function listUserIds(db: UserDb, search?: string, scope?: ParticipantScope) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .leftJoin(educationClasses, eq(users.class_id, educationClasses.id))
    .where(userWhere(search, scope));

  return rows.map((row) => row.id);
}

export async function findUserByUsername(db: UserDb, username: string) {
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return user ?? null;
}

export async function findUserById(db: UserDb, id: number) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function authenticateUser(db: UserDb, username: string, password: string) {
  const user = await findUserByUsername(db, username);
  if (!user || !user.active || !verifyPassword(password, user.password_hash)) return null;
  return user;
}

export async function findDemoUser(db: UserDb) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.is_demo, 1), eq(users.role, 'participant'), eq(users.active, 1)))
    .limit(1);
  return user ?? null;
}

async function clearDemoUser(db: UserDb) {
  await db.update(users).set({ is_demo: 0, updated_at: new Date() }).where(eq(users.is_demo, 1));
}

export async function createUser(db: UserDb, input: UserInput, createdBy: string | null = null) {
  if (input.is_demo) await clearDemoUser(db);
  const [result] = await db.insert(users).values({
    username: input.username,
    password_hash: hashPassword(input.password ?? ''),
    display_name: input.display_name,
    class_id: input.class_id,
    subject_id: input.subject_id,
    role: input.role,
    active: input.active ? 1 : 0,
    is_demo: input.is_demo ? 1 : 0,
    must_change_password: input.is_demo ? 0 : 1,
    created_by: createdBy,
  });
  return findUserById(db, Number(result.insertId));
}

export async function updateUser(db: UserDb, id: number, input: UserInput) {
  if (input.is_demo) await clearDemoUser(db);
  const values: {
    username: string;
    display_name: string;
    class_id: number | null;
    subject_id: number | null;
    role: UserRole;
    active: number;
    is_demo: number;
    must_change_password?: number;
    password_hash?: string;
    updated_at: Date;
  } = {
    username: input.username,
    display_name: input.display_name,
    class_id: input.class_id,
    subject_id: input.subject_id,
    role: input.role,
    active: input.active ? 1 : 0,
    is_demo: input.is_demo ? 1 : 0,
    updated_at: new Date(),
  };
  if (input.is_demo) values.must_change_password = 0;
  if (input.password) {
    values.password_hash = hashPassword(input.password);
    values.must_change_password = input.is_demo ? 0 : 1;
  }

  await db.update(users).set(values).where(eq(users.id, id));
  return findUserById(db, id);
}

function generateTemporaryPassword() {
  return randomBytes(9).toString('base64url');
}

export async function resetUserPassword(db: UserDb, id: number) {
  const user = await findUserById(db, id);
  if (!user) return null;
  if (user.is_demo) return { demoAccount: true as const };

  const temporaryPassword = generateTemporaryPassword();
  await db.update(users).set({
    password_hash: hashPassword(temporaryPassword),
    must_change_password: 1,
    updated_at: new Date(),
  }).where(eq(users.id, id));

  return {
    user: await findUserById(db, id),
    temporaryPassword,
  };
}

export async function changeUserPassword(db: UserDb, username: string, password: string) {
  const user = await findUserByUsername(db, username);
  if (!user) return null;

  await db.update(users).set({
    password_hash: hashPassword(password),
    must_change_password: 0,
    updated_at: new Date(),
  }).where(eq(users.id, user.id));

  return findUserById(db, user.id);
}

export async function assignSubjectToUsers(db: UserDb, userIds: number[], subjectId: number | null) {
  const [result] = await db
    .update(users)
    .set({ subject_id: subjectId, updated_at: new Date() })
    .where(inArray(users.id, userIds));

  return Number(result.affectedRows ?? 0);
}

export async function assignClassToUsers(db: UserDb, userIds: number[], classId: number | null) {
  const [result] = await db
    .update(users)
    .set({ class_id: classId, updated_at: new Date() })
    .where(inArray(users.id, userIds));

  return Number(result.affectedRows ?? 0);
}

export async function deleteUser(db: UserDb, id: number) {
  await db.delete(userClasses).where(eq(userClasses.user_id, id));
  await db.delete(users).where(eq(users.id, id));
}

export async function listUserClassIds(db: UserDb, userId: number): Promise<number[]> {
  const rows = await db.select({ class_id: userClasses.class_id }).from(userClasses).where(eq(userClasses.user_id, userId));
  return rows.map((row) => row.class_id);
}

// Kelas efektif guru: relasi user_classes bila ada, jika tidak class_id
// tunggal lama (akun yang belum tersentuh migrasi data 0033).
export async function listEffectiveUserClassIds(db: UserDb, user: typeof users.$inferSelect): Promise<number[]> {
  const mapped = await listUserClassIds(db, user.id);
  if (mapped.length > 0) return mapped;
  return user.class_id ? [user.class_id] : [];
}

export async function listUserClassMappings(db: UserDb, userIds: number[]): Promise<Map<number, UserClassMapping[]>> {
  const result = new Map<number, UserClassMapping[]>();
  if (userIds.length === 0) return result;
  const rows = await db
    .select({ user_id: userClasses.user_id, class_id: userClasses.class_id, source: userClasses.source, created_by: userClasses.created_by, created_at: userClasses.created_at })
    .from(userClasses)
    .where(inArray(userClasses.user_id, userIds));
  for (const row of rows) {
    const mapping: UserClassMapping = { class_id: row.class_id, source: row.source, created_by: row.created_by, created_at: row.created_at };
    const existing = result.get(row.user_id);
    if (existing) existing.push(mapping);
    else result.set(row.user_id, [mapping]);
  }
  return result;
}

// Lengkapi daftar pengguna hasil listUsers dengan petaan kelas sebenarnya.
// Pengguna guru tanpa baris relasi mempertahankan fallback class_id tunggal
// yang sudah disintesis toPublicUser.
export async function attachUserClassMappings<T extends ReturnType<typeof toPublicUser>>(db: UserDb, publicUsers: T[]): Promise<T[]> {
  const teacherIds = publicUsers.filter((user) => user.role !== 'participant').map((user) => user.id);
  if (teacherIds.length === 0) return publicUsers;
  const mappings = await listUserClassMappings(db, teacherIds);
  return publicUsers.map((user) => {
    const rows = mappings.get(user.id);
    if (!rows) return user;
    return { ...user, class_ids: rows.map((row) => row.class_id), class_mappings: rows };
  });
}

export async function replaceUserClasses(
  db: UserDb,
  userId: number,
  classIds: number[],
  options: { source: UserClassSource; createdBy: string | null },
) {
  const uniqueIds = [...new Set(classIds)];
  await db.delete(userClasses).where(eq(userClasses.user_id, userId));
  if (uniqueIds.length > 0) {
    await db.insert(userClasses).values(uniqueIds.map((classId) => ({
      user_id: userId,
      class_id: classId,
      source: options.source,
      created_by: options.createdBy,
    })));
  }
  return uniqueIds;
}

export async function addUserClass(
  db: UserDb,
  userId: number,
  classId: number,
  options: { source: UserClassSource; createdBy: string | null },
) {
  const existing = await listUserClassIds(db, userId);
  if (existing.includes(classId)) return false;
  await db.insert(userClasses).values({ user_id: userId, class_id: classId, source: options.source, created_by: options.createdBy });
  return true;
}

export async function removeUserClass(db: UserDb, userId: number, classId: number) {
  await db.delete(userClasses).where(and(eq(userClasses.user_id, userId), eq(userClasses.class_id, classId)));
}

export async function countParticipantUsers(db: UserDb, scope?: ParticipantScope) {
  const rows = await db.select({ id: users.id }).from(users).where(scope ? userWhere(undefined, scope) : eq(users.role, 'participant'));
  return rows.length;
}

/**
 * Jumlah peserta per kelas berdasarkan ikatan siswa yang sebenarnya:
 * akun berperan 'participant' terikat ke satu kelas lewat users.class_id.
 * Kelas tanpa siswa tidak muncul di peta (pemanggil memakai 0).
 */
export async function countParticipantsByClassId(db: UserDb) {
  const rows = await db.select({ class_id: users.class_id }).from(users).where(eq(users.role, 'participant'));
  const counts = new Map<number, number>();
  for (const row of rows) {
    if (row.class_id == null) continue;
    counts.set(row.class_id, (counts.get(row.class_id) ?? 0) + 1);
  }
  return counts;
}

export async function deleteAllParticipants(db: UserDb) {
  const [result] = await db.delete(users).where(eq(users.role, 'participant'));
  return Number(result.affectedRows ?? 0);
}

export async function countUsers(db: UserDb) {
  const rows = await db.select({ id: users.id }).from(users);
  return rows.length;
}

export async function hasUsers(db: UserDb) {
  const [user] = await db.select({ id: users.id }).from(users).limit(1);
  return Boolean(user);
}

export async function hasAdminUsers(db: UserDb) {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.active, 1), or(eq(users.role, 'admin'), eq(users.role, 'editor'))))
    .limit(1);
  return Boolean(user);
}
