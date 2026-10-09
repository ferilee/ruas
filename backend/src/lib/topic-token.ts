import { createHash, timingSafeEqual } from 'node:crypto';

export function normalizeTopicToken(token: string) {
  return token.trim();
}

export function hashTopicToken(token: string) {
  return createHash('sha256').update(normalizeTopicToken(token)).digest('hex');
}

export function matchesTopicToken(tokenHash: string | null, token: string | undefined) {
  if (!tokenHash || !token) return false;

  const expected = Buffer.from(tokenHash, 'hex');
  const actual = Buffer.from(hashTopicToken(token), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
