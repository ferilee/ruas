import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { classIdsMatch } from '@/services/topic-access-service';
import { hashTopicToken, matchesTopicToken, normalizeTopicToken } from '@/lib/topic-token';

describe('topic token helpers', () => {
  it('normalizes topic tokens to uppercase', () => {
    expect(normalizeTopicToken(' demo ')).toBe('DEMO');
    expect(hashTopicToken(' demo ')).toBe(hashTopicToken('DEMO'));
  });

  it('accepts uppercase and legacy lowercase token hashes', () => {
    expect(matchesTopicToken(hashTopicToken('DEMORUAS'), 'demoruas')).toBe(true);

    const legacyHash = createHash('sha256').update('demoruas').digest('hex');
    expect(matchesTopicToken(legacyHash, 'DEMORUAS')).toBe(true);
  });
});

describe('classIdsMatch', () => {
  it('matches class IDs when the database returns one value as text', () => {
    expect(classIdsMatch('8', 8)).toBe(true);
  });

  it('does not match different or invalid class IDs', () => {
    expect(classIdsMatch('8', 9)).toBe(false);
    expect(classIdsMatch(null, 8)).toBe(false);
  });
});
