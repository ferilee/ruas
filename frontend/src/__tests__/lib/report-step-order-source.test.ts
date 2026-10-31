import { describe, expect, it } from 'vitest';
import reportsPanelSource from '@/components/ReportsPanel.vue?raw';
import adminSource from '@/views/AdminView.vue?raw';

// Penataan ulang langkah Laporan hidup di varian simple ReportsPanel:
// hasil siswa mendahului analisis, analisis terlipat, dan konteks
// topik+kelas diingat. Regresinya dijaga lewat test baca-sumber karena
// dua risiko utamanya bersifat struktural — urutan DOM dan jaminan bahwa
// lipatan layar tidak mengurangi dokumen cetak ekspor.
const simpleTemplate = reportsPanelSource.slice(
  reportsPanelSource.indexOf('<template v-if="props.simple">'),
  reportsPanelSource.indexOf('<template v-else>'),
);
const printDocumentsStart = reportsPanelSource.indexOf('class="report-print-documents"');
const printDocuments = reportsPanelSource.slice(printDocumentsStart, reportsPanelSource.indexOf('</template>', printDocumentsStart));

describe('simple report ordering and folded analysis', () => {
  it('renders student results before the question analysis in the simple variant', () => {
    const resultsIndex = simpleTemplate.indexOf('class="simple-report-results"');
    const analysisIndex = simpleTemplate.indexOf('class="simple-question-stats"');
    expect(resultsIndex).toBeGreaterThanOrEqual(0);
    expect(analysisIndex).toBeGreaterThan(resultsIndex);
  });

  it('numbers the simple sections in their honest order', () => {
    expect(simpleTemplate).toContain('<strong>1. Pilih yang ingin dilihat</strong>');
    expect(simpleTemplate).toContain('<strong>2. Lihat hasil siswa</strong>');
    expect(simpleTemplate).toContain('<strong>3. Analisis per soal</strong>');
  });

  it('folds the analysis behind an accessible toggle that is closed by default', () => {
    expect(reportsPanelSource).toContain('const simpleAnalysisOpen = ref(false);');
    expect(simpleTemplate).toContain('class="simple-analysis-toggle"');
    expect(simpleTemplate).toContain(':aria-expanded="simpleAnalysisOpen"');
    expect(simpleTemplate).toContain("{{ simpleAnalysisOpen ? 'Tutup analisis' : 'Lihat analisis' }}");
    expect(simpleTemplate).toContain('<template v-if="simpleAnalysisOpen">');
    // Isi analisis tidak berubah: 10 teratas di layar, urutan data apa adanya.
    expect(simpleTemplate).toContain('questionStatistics.slice(0, 10)');
  });

  it('keeps the full question statistics in the print document regardless of the fold', () => {
    // Dokumen cetak dirender dari data yang sama (bukan dari DOM layar)
    // dan tidak bergantung pada simpleAnalysisOpen sama sekali.
    expect(printDocuments).toContain('v-for="(stat, index) in questionStatistics"');
    expect(printDocuments).not.toContain('simpleAnalysisOpen');
    expect(printDocuments).not.toContain('slice(0, 10)');
    expect(reportsPanelSource).toMatch(/\.report-print-documents \{ display: none; \}/);
  });

  it('keeps the admin variant in its original order with the analysis before student results', () => {
    const adminTemplate = reportsPanelSource.slice(reportsPanelSource.indexOf('<template v-else>'), reportsPanelSource.indexOf('<div v-if="detail"'));
    const analysisIndex = adminTemplate.indexOf('Analisis per soal (semua siswa)');
    const resultsIndex = adminTemplate.indexOf('<h3>Hasil siswa</h3>');
    expect(analysisIndex).toBeGreaterThanOrEqual(0);
    expect(resultsIndex).toBeGreaterThan(analysisIndex);
    expect(adminTemplate).not.toContain('simple-analysis-toggle');
  });
});

describe('simple report remembered context wiring', () => {
  it('stores and restores the context through the report-context lib', () => {
    expect(reportsPanelSource).toContain("from '@/lib/report-context'");
    expect(reportsPanelSource).toContain('resolveReportContext(readStoredReportContext(props.username), topics.value, curriculum.classes)');
    expect(reportsPanelSource).toContain('storeReportContext(props.username, { topic_id: filters.topic_id, class_id: filters.class_id })');
    expect(reportsPanelSource).toContain('latestReportTopicId(rows.value)');
  });

  it('only initializes the remembered context for the simple variant', () => {
    expect(reportsPanelSource).toContain('props.simple ? initializeSimpleReport() : loadReport()');
    expect(reportsPanelSource).toContain('if (!props.simple || !props.username) return;');
  });

  it('routes simple filter changes through the context handler and gets the username from AdminView', () => {
    expect(simpleTemplate.match(/@change="handleSimpleContextChange"/g)).toHaveLength(2);
    expect(adminSource).toContain(':username="adminSession?.username ?? \'\'"');
  });
});
