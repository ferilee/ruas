import { and, asc, eq, inArray, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { randomBytes } from 'node:crypto';
import { educationClasses } from '@/db/schema/education-classes';
import { users } from '@/db/schema/users';
import { subjects } from '@/db/schema/subjects';
import type { Pool } from '@/db/connection';
import { hashPassword, verifyPassword } from '@/lib/password';

type UserDb = ReturnType<typeof drizzle>;

export type UserRole = 'admin' | 'editor' | 'participant';

export interface UserInput {
  username: string;
  password?: string;
  display_name: string;
  class_id: number | null;
  subject_id: number | null;
  role: UserRole;
  active: boolean;
  is_demo: boolean;
}

export function createUserDb(pool: Pool) {
  return drizzle(pool, { schema: { educationClasses, subjects, users }, mode: 'default' });
}

export function toPublicUser(user: typeof users.$inferSelect, classLabel?: string | null) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    class_id: user.class_id,
    class_label: classLabel ?? null,
    subject_id: user.subject_id,
    role: user.role,
    active: Boolean(user.active),
    is_demo: Boolean(user.is_demo),
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

export async function listUsers(db: UserDb, search?: string) {
  const rows = await db
    .select({ user: users, class_label: educationClasses.label })
    .from(users)
    .leftJoin(educationClasses, eq(users.class_id, educationClasses.id))
    .where(userSearchCondition(search))
    .orderBy(asc(users.display_name), asc(users.id));

  return rows.map(({ user, class_label }) => toPublicUser(user, class_label));
}

export async function listUserIds(db: UserDb, search?: string) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .leftJoin(educationClasses, eq(users.class_id, educationClasses.id))
    .where(userSearchCondition(search));

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

export async function createUser(db: UserDb, input: UserInput) {
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
  await db.delete(users).where(eq(users.id, id));
}

export async function countParticipantUsers(db: UserDb) {
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, 'participant'));
  return rows.length;
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
