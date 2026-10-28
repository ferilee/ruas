import { describe, expect, it } from 'vitest';
import { slugifyLabel, suggestExternalId } from '@/lib/slug';

describe('slugifyLabel (RUAS-005)', () => {
  it('generates the checklist example automatically', () => {
    expect(slugifyLabel('Matematika Keuangan')).toBe('matematika-keuangan');
  });

  it('collapses punctuation and repeated spaces into single hyphens', () => {
    expect(slugifyLabel('Barisan & Deret: Aritmetika!')).toBe('barisan-deret-aritmetika');
    expect(slugifyLabel('  Sistem   Persamaan  ')).toBe('sistem-persamaan');
  });

  it('strips diacritics and respects the backend max length', () => {
    expect(slugifyLabel('Café Üjian')).toBe('cafe-ujian');
    expect(slugifyLabel('a'.repeat(80))).toHaveLength(50);
  });

  it('suggests sequential external IDs per topic', () => {
    expect(suggestExternalId('matematika-keuangan', 16)).toBe('q_matematika-keuangan_016');
    expect(suggestExternalId('', 1)).toBe('q_soal_001');
  });
});
