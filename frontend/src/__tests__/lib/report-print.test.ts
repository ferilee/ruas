import { describe, expect, it } from 'vitest';
import { formatReportPrintDate, reportPrintBrand, reportPrintContext, reportPrintDocumentTitle, reportPrintHeading } from '@/lib/report-print';

describe('report print helpers', () => {
  it('names both export documents', () => {
    expect(reportPrintHeading('questions')).toBe('Analisis per Soal');
    expect(reportPrintHeading('students')).toBe('Hasil Siswa');
  });

  it('builds a document title that doubles as a sensible PDF file name', () => {
    expect(reportPrintDocumentTitle('questions', 'SMKN Pasirian')).toBe('Analisis per Soal — SMKN Pasirian');
    expect(reportPrintDocumentTitle('students', 'SMKN Pasirian')).toBe('Hasil Siswa — SMKN Pasirian');
    expect(reportPrintDocumentTitle('questions', '  SMKN Pasirian  ')).toBe('Analisis per Soal — SMKN Pasirian');
  });

  it('falls back to the bare heading when no school name is configured', () => {
    expect(reportPrintDocumentTitle('questions', null)).toBe('Analisis per Soal');
    expect(reportPrintDocumentTitle('students', undefined)).toBe('Hasil Siswa');
    expect(reportPrintDocumentTitle('students', '   ')).toBe('Hasil Siswa');
  });

  it('builds the document brand line with and without a school name', () => {
    expect(reportPrintBrand('SMKN Pasirian')).toBe('RUAS — Ruang Asesmen · SMKN Pasirian');
    expect(reportPrintBrand(null)).toBe('RUAS — Ruang Asesmen');
  });

  it('summarizes the active filter context for the document header', () => {
    expect(reportPrintContext({ topicLabel: 'Semua topik', classLabel: 'Semua kelas', completedAttempts: 47, totalAttempts: 47 })).toBe('Topik: Semua topik · Kelas: Semua kelas · 47 dari 47 hasil selesai');
    expect(reportPrintContext({ topicLabel: 'SPtLDV', classLabel: '11 TKJ B', completedAttempts: 20, totalAttempts: 25 })).toBe('Topik: SPtLDV · Kelas: 11 TKJ B · 20 dari 25 hasil selesai');
  });

  it('formats the print date in Indonesian long form', () => {
    const label = formatReportPrintDate(new Date(2026, 9, 29));
    expect(label).toContain('2026');
    expect(label).toContain('29');
  });
});
