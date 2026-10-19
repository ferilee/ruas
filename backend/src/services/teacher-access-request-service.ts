import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { teacherAccessRequests } from '@/db/schema/teacher-access-requests';
import { users } from '@/db/schema/users';
import type { Pool } from '@/db/connection';
import { hashPassword } from '@/lib/password';

type TeacherRequestDb = ReturnType<typeof drizzle>;

export interface TeacherAccessRequestInput {
  username: string;
  display_name: string;
  password: string;
  contact: string | null;
  requested_class: string | null;
  requested_subject: string | null;
}

export function createTeacherRequestDb(pool: Pool) {
  return drizzle(pool, { schema: { teacherAccessRequests, users }, mode: 'default' });
}

export async function createTeacherAccessRequest(db: TeacherRequestDb, input: TeacherAccessRequestInput) {
  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.username, input.username)).limit(1);
  if (existingUser) return 'username_taken' as const;

  const [existingRequest] = await db
    .select({ id: teacherAccessRequests.id, status: teacherAccessRequests.status })
    .from(teacherAccessRequests)
    .where(eq(teacherAccessRequests.username, input.username))
    .limit(1);
  if (existingRequest?.status === 'pending') return 'already_pending' as const;
  if (existingRequest) {
    await db.delete(teacherAccessRequests).where(eq(teacherAccessRequests.id, existingRequest.id));
  }

  const [result] = await db.insert(teacherAccessRequests).values({
    username: input.username,
    display_name: input.display_name,
    contact: input.contact,
    requested_class: input.requested_class,
    requested_subject: input.requested_subject,
    password_hash: hashPassword(input.password),
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    updated_at: new Date(),
  });
  return Number(result.insertId);
}

export async function listTeacherAccessRequests(db: TeacherRequestDb, status?: 'pending' | 'approved' | 'rejected' | 'all') {
  const rows = await db
    .select()
    .from(teacherAccessRequests)
    .where(status && status !== 'all' ? eq(teacherAccessRequests.status, status) : undefined)
    .orderBy(asc(teacherAccessRequests.status), asc(teacherAccessRequests.created_at));
  return rows.map(({ password_hash: _passwordHash, ...row }) => row);
}

export async function reviewTeacherAccessRequest(
  db: TeacherRequestDb,
  id: number,
  action: 'approve' | 'reject',
  reviewedBy: string,
  rejectionReason: string | null,
) {
  const [request] = await db.select().from(teacherAccessRequests).where(eq(teacherAccessRequests.id, id)).limit(1);
  if (!request) return 'not_found' as const;
  if (request.status !== 'pending') return 'already_reviewed' as const;

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.username, request.username)).limit(1);
  if (existingUser) return 'username_taken' as const;

  const reviewedAt = new Date();
  if (action === 'reject') {
    await db.update(teacherAccessRequests).set({
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
      rejection_reason: rejectionReason,
      updated_at: reviewedAt,
    }).where(eq(teacherAccessRequests.id, id));
    return 'rejected' as const;
  }

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      username: request.username,
      password_hash: request.password_hash,
      display_name: request.display_name,
      class_id: null,
      subject_id: null,
      role: 'editor',
      active: 1,
      is_demo: 0,
      must_change_password: 1,
      created_by: reviewedBy,
    });
    await tx.update(teacherAccessRequests).set({
      status: 'approved',
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
      rejection_reason: null,
      updated_at: reviewedAt,
    }).where(eq(teacherAccessRequests.id, id));
  });
  return 'approved' as const;
}
