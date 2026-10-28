import { describe, expect, it } from 'vitest';
import reportsPanelSource from '@/components/ReportsPanel.vue?raw';

// Regresi tabel Analisis per soal: tabel ini pernah meminjam class
// class-statistics-table yang white-space: nowrap, sehingga teks soal
// panjang tidak bisa membungkus dan luber menimpa kolom lain.
const questionPanel = reportsPanelSource.slice(reportsPanelSource.indexOf('question-statistics-panel'));
const questionTableCss = reportsPanelSource.slice(reportsPanelSource.indexOf('.question-statistics-table {'));

describe('question statistics table', () => {
  it('uses its own table class instead of the class statistics table', () => {
    expect(questionPanel).toContain('<table class="question-statistics-table">');
    expect(questionPanel).not.toContain('<table class="class-statistics-table">');
  });

  it('keeps the class statistics table untouched for short numeric stats', () => {
    expect(reportsPanelSource).toContain('<table class="class-statistics-table">');
    expect(reportsPanelSource).toMatch(/\.class-statistics-table th, \.class-statistics-table td \{[^}]*white-space: nowrap;/);
  });

  it('lays out columns with a fixed layout so long questions wrap inside their cell', () => {
    expect(questionTableCss).toMatch(/\.question-statistics-table \{[^}]*table-layout: fixed;/);
    expect(questionTableCss).toMatch(/\.question-statistics-table th, \.question-statistics-table td \{[^}]*white-space: normal;/);
    expect(questionTableCss).toMatch(/\.question-statistics-table th, \.question-statistics-table td \{[^}]*vertical-align: top;/);
  });

  it('gives the question column the widest share via colgroup', () => {
    expect(questionPanel).toContain('<colgroup>');
    expect(questionPanel).toContain('<col style="width: 40%" />');
  });

  it('wraps long question text instead of clipping or spilling it', () => {
    expect(reportsPanelSource).toMatch(/\.question-stat-text \{ overflow-wrap: anywhere; \}/);
    expect(questionTableCss).toMatch(/\.question-statistics-table \.nowrap-cell \{ white-space: nowrap; \}/);
  });
});
