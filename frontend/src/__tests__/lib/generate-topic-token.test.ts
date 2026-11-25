import { describe, expect, it } from 'vitest';
import { generateTopicToken, TOPIC_TOKEN_ALPHABET, TOPIC_TOKEN_LENGTH } from '@/lib/generate-topic-token';

describe('generateTopicToken', () => {
  it('menghasilkan token dengan panjang tepat 6 secara bawaan', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateTopicToken()).toHaveLength(TOPIC_TOKEN_LENGTH);
    }
  });

  it('hanya memakai karakter dari alfabet tanpa karakter membingungkan', () => {
    const allowed = new Set(TOPIC_TOKEN_ALPHABET.split(''));
    for (let i = 0; i < 50; i += 1) {
      for (const char of generateTopicToken()) {
        expect(allowed.has(char)).toBe(true);
      }
    }
    for (const confusing of ['I', 'L', 'O', '0', '1']) {
      expect(TOPIC_TOKEN_ALPHABET).not.toContain(confusing);
    }
  });

  it('menghormati panjang kustom dan menghasilkan token yang bervariasi', () => {
    expect(generateTopicToken(10)).toHaveLength(10);
    const samples = new Set(Array.from({ length: 20 }, () => generateTopicToken()));
    expect(samples.size).toBeGreaterThan(1);
  });
});
