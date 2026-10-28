import { describe, expect, it } from 'vitest';
import { assessmentTitle } from '@/lib/school-title';

describe('assessmentTitle', () => {
  it('uses the configured school name', () => {
    expect(assessmentTitle('SMKN Pasirian')).toBe('Asesmen SMKN Pasirian');
  });

  it('trims excess whitespace around the school name', () => {
    expect(assessmentTitle('  SMKN Pasirian  ')).toBe('Asesmen SMKN Pasirian');
  });

  it('falls back to the generic title when the name is empty', () => {
    expect(assessmentTitle('')).toBe('Ruang Asesmen');
    expect(assessmentTitle('   ')).toBe('Ruang Asesmen');
  });

  it('falls back to the generic title when the name is missing', () => {
    expect(assessmentTitle(null)).toBe('Ruang Asesmen');
    expect(assessmentTitle(undefined)).toBe('Ruang Asesmen');
  });
});
