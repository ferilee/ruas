import { and, asc, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { feedbackEntries } from '@/db/schema/feedback-entries';
import type { Pool } from '@/db/connection';

type FeedbackDb = ReturnType<typeof drizzle>;
type FeedbackKind = 'suggestion' | 'testimonial';
type FeedbackStatus = 'pending' | 'approved' | 'rejected';

export interface FeedbackInput {
  kind: FeedbackKind;
  message: string;
  display_name: string;
  role_label: string;
  username: string | null;
  consent_public: boolean;
}

export function createFeedbackDb(pool: Pool) {
  return drizzle(pool, { schema: { feedbackEntries }, mode: 'default' });
}

export async function createFeedback(db: FeedbackDb, input: FeedbackInput) {
  const [result] = await db.insert(feedbackEntries).values({
    kind: input.kind,
    message: input.message,
    display_name: input.display_name,
    role_label: input.role_label,
    username: input.username,
    consent_public: input.kind === 'testimonial' && input.consent_public ? 1 : 0,
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    updated_at: new Date(),
  });
  return Number(result.insertId);
}

export async function listFeedback(db: FeedbackDb, status: FeedbackStatus | 'all' = 'pending') {
  return db
    .select()
    .from(feedbackEntries)
    .where(status === 'all' ? undefined : eq(feedbackEntries.status, status))
    .orderBy(asc(feedbackEntries.status), desc(feedbackEntries.created_at));
}

export async function listPublishedTestimonials(db: FeedbackDb) {
  return db
    .select({
      id: feedbackEntries.id,
      message: feedbackEntries.message,
      display_name: feedbackEntries.display_name,
      role_label: feedbackEntries.role_label,
    })
    .from(feedbackEntries)
    .where(and(
      eq(feedbackEntries.kind, 'testimonial'),
      eq(feedbackEntries.status, 'approved'),
      eq(feedbackEntries.consent_public, 1),
    ))
    .orderBy(desc(feedbackEntries.reviewed_at), desc(feedbackEntries.created_at));
}

export async function reviewFeedback(
  db: FeedbackDb,
  id: number,
  action: 'approve' | 'reject',
  reviewedBy: string,
  rejectionReason: string | null,
) {
  const [entry] = await db.select().from(feedbackEntries).where(eq(feedbackEntries.id, id)).limit(1);
  if (!entry) return 'not_found' as const;
  if (entry.status !== 'pending') return 'already_reviewed' as const;

  const reviewedAt = new Date();
  await db.update(feedbackEntries).set({
    status: action === 'approve' ? 'approved' : 'rejected',
    reviewed_by: reviewedBy,
    reviewed_at: reviewedAt,
    rejection_reason: action === 'reject' ? rejectionReason : null,
    updated_at: reviewedAt,
  }).where(eq(feedbackEntries.id, id));

  return action === 'approve' ? 'approved' as const : 'rejected' as const;
}
