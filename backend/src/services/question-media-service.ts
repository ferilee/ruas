import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { questionMedia } from '@/db/schema/question-media';
import type { Pool } from '@/db/connection';
import type { MediaStorage } from './media-storage';

type MediaDb = ReturnType<typeof drizzle>;

export interface QuestionMediaResponse {
  id: number;
  url: string | null;
  alt_text: string;
  caption: string | null;
  display_order: number;
}

export interface QuestionMediaRecord extends QuestionMediaResponse {
  object_key: string;
  original_name: string;
  mime_type: string;
  file_size: number;
}

export function createQuestionMediaDb(pool: Pool) {
  return drizzle(pool, { schema: { questionMedia }, mode: 'default' });
}

export async function listQuestionMedia(db: MediaDb, questionId: number, storage: MediaStorage | null): Promise<QuestionMediaResponse[]> {
  if (!storage) return [];

  const rows = await db
    .select({
      id: questionMedia.id,
      object_key: questionMedia.object_key,
      alt_text: questionMedia.alt_text,
      caption: questionMedia.caption,
      display_order: questionMedia.display_order,
    })
    .from(questionMedia)
    .where(eq(questionMedia.question_id, questionId))
    .orderBy(asc(questionMedia.display_order), asc(questionMedia.id));

  return Promise.all(rows.map(async (row) => ({
    id: row.id,
    url: storage ? await storage.signedReadUrl(row.object_key) : null,
    alt_text: row.alt_text,
    caption: row.caption,
    display_order: row.display_order,
  })));
}

export async function listQuestionMediaRecords(db: MediaDb, questionId: number): Promise<QuestionMediaRecord[]> {
  const rows = await db
    .select({
      id: questionMedia.id,
      object_key: questionMedia.object_key,
      original_name: questionMedia.original_name,
      mime_type: questionMedia.mime_type,
      file_size: questionMedia.file_size,
      alt_text: questionMedia.alt_text,
      caption: questionMedia.caption,
      display_order: questionMedia.display_order,
    })
    .from(questionMedia)
    .where(eq(questionMedia.question_id, questionId))
    .orderBy(asc(questionMedia.display_order), asc(questionMedia.id));

  return rows.map((row) => ({ ...row, url: null }));
}

export async function findQuestionMediaRecord(db: MediaDb, questionId: number, mediaId: number) {
  const [row] = await db
    .select()
    .from(questionMedia)
    .where(eq(questionMedia.id, mediaId))
    .limit(1);
  return row?.question_id === questionId ? row : null;
}
