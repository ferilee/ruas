import { describe, expect, it } from 'vitest';
import { classIdsMatch } from '@/services/topic-access-service';

describe('classIdsMatch', () => {
  it('matches class IDs when the database returns one value as text', () => {
    expect(classIdsMatch('8', 8)).toBe(true);
  });

  it('does not match different or invalid class IDs', () => {
    expect(classIdsMatch('8', 9)).toBe(false);
    expect(classIdsMatch(null, 8)).toBe(false);
  });
});
