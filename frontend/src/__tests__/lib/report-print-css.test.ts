import { describe, expect, it } from 'vitest';
import reportsPanelSource from '@/components/ReportsPanel.vue?raw';
import reportExportMenuSource from '@/components/ReportExportMenu.vue?raw';

// Gerbang regresi ekspor PDF: memilih satu dokumen harus mencetak HANYA
// dokumen itu (kop + tabelnya), bukan seluruh halaman laporan.
const printCss = reportsPanelSource.slice(reportsPanelSource.indexOf('@media print'));

describe('report PDF export modes', () => {
  it('offers both export choices from the toolbar of both report modes', () => {
    expect(reportsPanelSource).toContain('<ReportExportMenu variant="dark"');
    expect(reportsPanelSource).toContain('<ReportExportMenu variant="light"');
    expect(reportExportMenuSource).toContain('PDF Analisis per Soal');
    expect(reportExportMenuSource).toContain('PDF Hasil Siswa');
    expect(reportExportMenuSource).toContain('aria-haspopup="menu"');
    expect(reportExportMenuSource).toContain(':aria-expanded="menuOpen"');
    expect(reportExportMenuSource).toContain('role="menu"');
  });

  it('keeps the print-only documents hidden on screen', () => {
    expect(reportsPanelSource).toMatch(/\.report-print-documents \{ display: none; \}/);
    expect(reportsPanelSource).toContain('class="report-print-documents"');
  });

  it('prints only the chosen document when a print mode is active', () => {
    expect(reportsPanelSource).toContain("'printing-questions': printMode === 'questions'");
    expect(reportsPanelSource).toContain("'printing-students': printMode === 'students'");
    expect(printCss).toMatch(/\.reports-panel\.printing-questions > \*:not\(\.report-print-documents\), \.reports-panel\.printing-students > \*:not\(\.report-print-documents\) \{ display: none !important; \}/);
    expect(printCss).toMatch(/\.reports-panel\.printing-questions \.report-print-documents, \.reports-panel\.printing-students \.report-print-documents \{ display: block; \}/);
  });

  it('formats print tables for paper: repeated header, unbroken rows, wrapping text', () => {
    expect(printCss).toMatch(/\.print-table \{[^}]*table-layout: fixed;/);
    expect(printCss).toMatch(/\.print-table thead \{ display: table-header-group; \}/);
    expect(printCss).toMatch(/\.print-table tr \{ page-break-inside: avoid; \}/);
    expect(printCss).toMatch(/\.print-table th, \.print-table td \{[^}]*white-space: normal;/);
    expect(printCss).toMatch(/\.print-table \.question-stat-text \{ overflow-wrap: anywhere; \}/);
  });

  it('drives printing through the selected mode and restores title and mode afterwards', () => {
    expect(reportsPanelSource).toContain("window.addEventListener('afterprint', restore)");
    expect(reportsPanelSource).toContain('document.title = reportPrintDocumentTitle(mode, schoolName.value)');
    expect(reportsPanelSource).toContain('document.title = originalTitle');
    expect(reportsPanelSource).toContain('printMode.value = null');
    expect(reportsPanelSource).toContain('window.setTimeout(restore, 1000)');
  });

  it('renders the full question statistics into the print document, not just the on-screen top 10', () => {
    const printDocuments = reportsPanelSource.slice(reportsPanelSource.indexOf('report-print-documents'));
    expect(printDocuments).toContain('v-for="(stat, index) in questionStatistics"');
    expect(printDocuments).toContain('v-for="group in reportGroups"');
    expect(printDocuments).toContain('{{ printBrandLine }}');
    expect(printDocuments).toContain('{{ printContextLabel }}');
  });
});
