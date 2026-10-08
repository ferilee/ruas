import { asc, eq, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
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
  subject_id: number | null;
  role: UserRole;
  active: boolean;
}

export function createUserDb(pool: Pool) {
  return drizzle(pool, { schema: { subjects, users }, mode: 'default' });
}

export function toPublicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    subject_id: user.subject_id,
    role: user.role,
    active: Boolean(user.active),
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export async function listUsers(db: UserDb, search?: string) {
  const normalizedSearch = search?.trim();
  const rows = await db
    .select()
    .from(users)
    .where(
      normalizedSearch
        ? or(like(users.username, `%${normalizedSearch}%`), like(users.display_name, `%${normalizedSearch}%`))
        : undefined,
    )
    .orderBy(asc(users.display_name), asc(users.id));

  return rows.map(toPublicUser);
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

export async function createUser(db: UserDb, input: UserInput) {
  const [result] = await db.insert(users).values({
    username: input.username,
    password_hash: hashPassword(input.password ?? ''),
    display_name: input.display_name,
    subject_id: input.subject_id,
    role: input.role,
    active: input.active ? 1 : 0,
  });
  return findUserById(db, Number(result.insertId));
}

export async function updateUser(db: UserDb, id: number, input: UserInput) {
  const values: {
    username: string;
    display_name: string;
    subject_id: number | null;
    role: UserRole;
    active: number;
    password_hash?: string;
    updated_at: Date;
  } = {
    username: input.username,
    display_name: input.display_name,
    subject_id: input.subject_id,
    role: input.role,
    active: input.active ? 1 : 0,
    updated_at: new Date(),
  };
  if (input.password) values.password_hash = hashPassword(input.password);

  await db.update(users).set(values).where(eq(users.id, id));
  return findUserById(db, id);
}

export async function deleteUser(db: UserDb, id: number) {
  await db.delete(users).where(eq(users.id, id));
}

export async function countUsers(db: UserDb) {
  const rows = await db.select({ id: users.id }).from(users);
  return rows.length;
}

export async function hasUsers(db: UserDb) {
  const [user] = await db.select({ id: users.id }).from(users).limit(1);
  return Boolean(user);
}
