import type { Context } from 'hono';

export function getParticipantIdentity(c: Context): string | null {
  return c.get('authUsername') || c.req.header('x-client-id') || null;
}
