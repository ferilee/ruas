import { Hono } from 'hono';
import { z } from 'zod';
import { subjects } from '@/db/schema/subjects';
import type { Pool } from '@/db/connection';
import { createParticipantDb, findParticipantProfile, saveParticipantProfile } from '@/services/participant-service';
import { eq } from 'drizzle-orm';
import { getParticipantIdentity } from '@/lib/participant-identity';

const profileSchema = z.object({
  participant_code: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(150),
  gender: z.enum(['male', 'female']),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  subject_id: z.coerce.number().int().positive(),
  access_token: z.string().max(255).nullable(),
});

export function participantProfileRoutes(pool: Pool) {
  const db = createParticipantDb(pool);
  const app = new Hono();

  app.get('/', async (c) => {
    const identityKey = getParticipantIdentity(c);
    if (!identityKey) return c.json({ profile: null });
    return c.json({ profile: await findParticipantProfile(db, identityKey) });
  });

  app.put('/', async (c) => {
    const identityKey = getParticipantIdentity(c);
    if (!identityKey) return c.json({ error: 'identity_required', message: 'Identitas peserta tidak tersedia.' }, 400);

    const parsed = profileSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'invalid_body', message: 'Data profil peserta tidak valid.' }, 400);

    const [subject] = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.id, parsed.data.subject_id)).limit(1);
    if (!subject) return c.json({ error: 'invalid_reference', message: 'Mata pelajaran tidak ditemukan.' }, 400);

    await saveParticipantProfile(db, identityKey, parsed.data);
    return c.json({ profile: await findParticipantProfile(db, identityKey) });
  });

  return app;
}
