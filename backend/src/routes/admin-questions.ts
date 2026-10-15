import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { questionMedia } from '@/db/schema/question-media';
import type { Pool } from '@/db/connection';
import { adminQuestionSchema, importPayloadSchema, importRequestSchema } from '@/validators/admin-question-validator';
import { parseQuestionIdParam } from '@/validators/question-validator';
import {
  createAdminDb,
  createAdminQuestion,
  deleteAdminQuestion,
  findAdminQuestion,
  importAdminQuestions,
  listAdminQuestions,
  setAdminQuestionArchived,
  updateAdminQuestion,
} from '@/services/admin-question-service';
import { findQuestionMediaRecord, listQuestionMedia } from '@/services/question-media-service';
import { convertQuestionImageToWebp } from '@/services/image-processor';
import type { MediaStorage } from '@/services/media-storage';

const questionListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  topic_id: z.coerce.number().int().positive().optional(),
  type: z.enum(['single_choice', 'multiple_response', 'true_false']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  status: z.enum(['active', 'archived', 'all']).default('active'),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().refine((value) => [25, 50, 100].includes(value), 'page_size harus 25, 50, atau 100.').default(25),
});

async function readJson(c: Context) {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

const mediaUploadSchema = z.object({
  alt_text: z.string().trim().max(255).optional(),
  caption: z.string().trim().max(1000).optional(),
});

const allowedMediaTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function adminQuestionRoutes(pool: Pool, mediaStorage: MediaStorage | null = null) {
  const db = createAdminDb(pool);
  const app = new Hono();

  app.get('/', async (c) => {
    const parsed = questionListQuerySchema.safeParse(c.req.query());
    if (!parsed.success) return c.json({ error: 'invalid_query', message: parsed.error.issues[0]?.message ?? 'Filter soal tidak valid.' }, 400);
    return c.json(await listAdminQuestions(db, parsed.data));
  });

  app.get('/:id', async (c) => {
    const id = parseQuestionIdParam(c.req.param('id'));
    if (id === null) return c.json({ error: 'invalid_param', message: 'ID soal tidak valid.' }, 400);

    const question = await findAdminQuestion(db, id);
    if (!question) return c.json({ error: 'not_found', message: 'Soal tidak ditemukan.' }, 404);
    const media = await listQuestionMedia(db, id, mediaStorage);
    return c.json({ question: { ...question, media } });
  });

  app.patch('/:id/archive', async (c) => {
    const id = parseQuestionIdParam(c.req.param('id'));
    if (id === null) return c.json({ error: 'invalid_param', message: 'ID soal tidak valid.' }, 400);

    const body = await readJson(c);
    if (!body || typeof body.archived !== 'boolean') {
      return c.json({ error: 'invalid_body', message: 'Properti archived harus berupa boolean.' }, 400);
    }

    const updated = await setAdminQuestionArchived(db, id, body.archived);
    if (!updated) return c.json({ error: 'not_found', message: 'Soal tidak ditemukan.' }, 404);
    return c.json({ archived: body.archived });
  });

  app.post('/:id/media', async (c) => {
    if (!mediaStorage) return c.json({ error: 'media_storage_unavailable', message: 'Penyimpanan gambar belum dikonfigurasi.' }, 503);

    const questionId = parseQuestionIdParam(c.req.param('id'));
    if (questionId === null) return c.json({ error: 'invalid_param', message: 'ID soal tidak valid.' }, 400);
    const question = await findAdminQuestion(db, questionId);
    if (!question) return c.json({ error: 'not_found', message: 'Soal tidak ditemukan.' }, 404);

    const body = await c.req.parseBody();
    const fileValue = body.file;
    const file = fileValue instanceof File ? fileValue : null;
    if (!file) return c.json({ error: 'invalid_body', message: 'File gambar wajib dipilih.' }, 400);
    if (!allowedMediaTypes.has(file.type)) return c.json({ error: 'invalid_file_type', message: 'Format gambar harus JPG, PNG, WEBP, atau GIF.' }, 400);
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) return c.json({ error: 'invalid_file_size', message: 'Ukuran gambar maksimal 10 MB.' }, 400);

    const metadata = mediaUploadSchema.safeParse({ alt_text: body.alt_text, caption: body.caption });
    if (!metadata.success) return c.json({ error: 'invalid_body', message: metadata.error.issues[0]?.message ?? 'Keterangan gambar tidak valid.' }, 400);

    const originalName = file.name.trim().slice(0, 255) || 'gambar';
    const altText = metadata.data.alt_text || originalName.replace(/\.[^.]+$/, '').slice(0, 255);
    let convertedImage;
    try {
      convertedImage = await convertQuestionImageToWebp(new Uint8Array(await file.arrayBuffer()));
    } catch {
      return c.json({ error: 'invalid_image', message: 'Isi file gambar tidak dapat diproses.' }, 400);
    }

    const objectKey = `questions/${questionId}/${crypto.randomUUID()}.webp`;

    try {
      await mediaStorage.upload(objectKey, convertedImage.body, convertedImage.contentType);
      const [inserted] = await db.insert(questionMedia).values({
        question_id: questionId,
        object_key: objectKey,
        original_name: originalName,
        mime_type: convertedImage.contentType,
        file_size: convertedImage.fileSize,
        alt_text: altText,
        caption: metadata.data.caption || null,
        display_order: 0,
      });
      const mediaId = Number(inserted.insertId);
      const media = await listQuestionMedia(db, questionId, mediaStorage);
      return c.json({ media: media.find((item) => item.id === mediaId) ?? null }, 201);
    } catch (error) {
      await mediaStorage.remove(objectKey).catch(() => undefined);
      throw error;
    }
  });

  app.delete('/:id/media/:mediaId', async (c) => {
    if (!mediaStorage) return c.json({ error: 'media_storage_unavailable', message: 'Penyimpanan gambar belum dikonfigurasi.' }, 503);

    const questionId = parseQuestionIdParam(c.req.param('id'));
    const mediaId = parseQuestionIdParam(c.req.param('mediaId'));
    if (questionId === null || mediaId === null) return c.json({ error: 'invalid_param', message: 'ID media tidak valid.' }, 400);

    const media = await findQuestionMediaRecord(db, questionId, mediaId);
    if (!media) return c.json({ error: 'not_found', message: 'Gambar tidak ditemukan.' }, 404);

    await mediaStorage.remove(media.object_key);
    await db.delete(questionMedia).where(eq(questionMedia.id, mediaId));
    return c.json({ deleted: true });
  });

  app.post('/', async (c) => {
    const parsed = adminQuestionSchema.safeParse(await readJson(c));
    if (!parsed.success) return c.json({ error: 'invalid_body', message: parsed.error.issues[0]?.message ?? 'Data soal tidak valid.' }, 400);

    const id = await createAdminQuestion(db, parsed.data);
    if (id === null) return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404);
    return c.json({ question_id: id }, 201);
  });

  app.put('/:id', async (c) => {
    const id = parseQuestionIdParam(c.req.param('id'));
    if (id === null) return c.json({ error: 'invalid_param', message: 'ID soal tidak valid.' }, 400);

    const parsed = adminQuestionSchema.safeParse(await readJson(c));
    if (!parsed.success) return c.json({ error: 'invalid_body', message: parsed.error.issues[0]?.message ?? 'Data soal tidak valid.' }, 400);

    const updated = await updateAdminQuestion(db, id, parsed.data);
    if (!updated) return c.json({ error: 'not_found', message: 'Soal atau topik tidak ditemukan.' }, 404);
    return c.json({ updated: true });
  });

  app.delete('/:id', async (c) => {
    const id = parseQuestionIdParam(c.req.param('id'));
    if (id === null) return c.json({ error: 'invalid_param', message: 'ID soal tidak valid.' }, 400);

    const result = await deleteAdminQuestion(db, id, mediaStorage);
    if (result === 'not_found') return c.json({ error: 'not_found', message: 'Soal tidak ditemukan.' }, 404);
    if (result === 'in_use') {
      return c.json({
        error: 'question_in_use',
        message: 'Soal tidak dapat dihapus karena sudah digunakan dalam riwayat asesmen. Hapus soal akan merusak laporan peserta.',
      }, 409);
    }
    return c.json({ deleted: true });
  });

  app.post('/import', async (c) => {
    const request = importRequestSchema.safeParse(await readJson(c));
    if (!request.success) return c.json({ error: 'invalid_body', message: 'Payload import tidak valid.' }, 400);

    const data = importPayloadSchema.safeParse(request.data.data);
    if (!data.success) return c.json({ error: 'invalid_import', message: data.error.issues[0]?.message ?? 'Format JSON soal tidak valid.' }, 400);

    const questions = Array.isArray(data.data) ? data.data : data.data.questions;
    const summary = await importAdminQuestions(db, questions, request.data.mode, request.data.dry_run);

    if (summary.errors.length > 0) {
      const details = summary.errors.slice(0, 3).join(' ');
      const remaining = summary.errors.length - Math.min(summary.errors.length, 3);
      const suffix = remaining > 0 ? ` Dan ${remaining} error lainnya.` : '';
      return c.json({ error: 'import_validation_failed', message: `Import gagal. ${details}${suffix}`, summary }, 400);
    }

    return c.json({ summary });
  });

  return app;
}
