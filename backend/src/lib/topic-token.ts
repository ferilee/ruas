import { createHash, timingSafeEqual } from 'node:crypto';

export function normalizeTopicToken(token: string) {
  return token.trim().toUpperCase();
}

export function hashTopicToken(token: string) {
  return createHash('sha256').update(normalizeTopicToken(token)).digest('hex');
}

export function matchesTopicToken(tokenHash: string | null, token: string | undefined) {
  if (!tokenHash || !token) return false;

  const expected = Buffer.from(tokenHash, 'hex');
  const actualHashes = [
    hashTopicToken(token),
    createHash('sha256').update(token.trim()).digest('hex'),
    createHash('sha256').update(token.trim().toLowerCase()).digest('hex'),
  ];

  return actualHashes.some((actualHash) => {
    const actual = Buffer.from(actualHash, 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  });
}
