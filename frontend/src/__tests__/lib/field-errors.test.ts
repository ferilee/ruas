import { describe, expect, it } from 'vitest';
import { extractFieldErrors } from '@/lib/field-errors';

describe('extractFieldErrors (RUAS-002)', () => {
  it('reads the fields map attached by the API client', () => {
    const error = Object.assign(new Error('Slug topik sudah digunakan.'), { fields: { slug: 'Slug topik sudah digunakan.' } });
    expect(extractFieldErrors(error)).toEqual({ slug: 'Slug topik sudah digunakan.' });
  });

  it('returns an empty map for plain errors', () => {
    expect(extractFieldErrors(new Error('boom'))).toEqual({});
    expect(extractFieldErrors('nope')).toEqual({});
    expect(extractFieldErrors(null)).toEqual({});
  });
});
