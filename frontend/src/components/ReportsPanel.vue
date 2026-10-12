<template>
  <section class="reports-panel">
    <ConfirmDialog :open="resetConfirmOpen" title="Reset seluruh hasil asesmen?" :message="resetConfirmationMessage" confirm-label="Reset hasil" confirmation-phrase="RESET HASIL ASESMEN" @confirm="resetReportData" @cancel="closeResetConfirmation" />
    <div class="panel report-toolbar no-print">
      <div>
        <span class="eyebrow">MONITORING HASIL</span>
        <h2>Laporan Asesmen</h2>
        <p>Gunakan filter untuk melihat hasil siswa dan menyiapkan laporan.</p>
      </div>
      <div class="toolbar-actions">
        <button class="secondary-btn" type="button" :disabled="loading" @click="loadReport">Muat ulang</button>
        <button class="primary-btn" type="button" :disabled="loading || rows.length === 0" @click="exportPdf">Ekspor PDF</button>
        <button class="danger-btn" type="button" :disabled="resetting || resetCount === 0" @click="openResetConfirmation">{{ resetting ? 'Mereset...' : `Reset hasil (${resetCount})` }}</button>
      </div>
    </div>

    <section :class="['panel', 'filters-panel', 'no-print', { collapsed: !filtersOpen }]">
      <div class="panel-heading">
        <div><h3>Filter laporan</h3><p>Secara default hanya asesmen yang sudah selesai yang ditampilkan.</p><div v-if="activeFilterLabels.length" class="active-filter-summary"><span v-for="filter in activeFilterLabels" :key="filter">{{ filter }}</span></div></div>
        <button class="filter-toggle" type="button" :aria-expanded="filtersOpen" @click="filtersOpen = !filtersOpen">{{ filtersOpen ? 'Sembunyikan filter' : 'Tampilkan filter' }} <span aria-hidden="true">{{ filtersOpen ? '⌃' : '⌄' }}</span></button>
      </div>
      <div v-show="filtersOpen" class="filter-grid">
        <label>Status<RuasSelect v-model="filters.status" :options="statusOptions" aria-label="Status laporan" @change="loadReport" /></label>
        <label>Kelas<RuasSelect v-model="filters.class_id" :options="classOptions" aria-label="Filter kelas" @change="loadReport" /></label>
        <label>Jenis asesmen<RuasSelect v-model="filters.assessment_type_id" :options="assessmentTypeOptions" aria-label="Filter jenis asesmen" @change="loadReport" /></label>
        <label>Mata pelajaran<RuasSelect v-model="filters.subject_id" :options="subjectOptions" aria-label="Filter mata pelajaran" @change="loadReport" /></label>
        <label>Dari tanggal
          <input v-model="filters.from" type="date" @change="loadReport" />
        </label>
        <label>Sampai tanggal
          <input v-model="filters.to" type="date" @change="loadReport" />
        </label>
        <label class="search-field">Cari siswa
          <input v-model="filters.search" placeholder="Nama, username, atau kode peserta" @keyup.enter="loadReport" />
        </label>
        <button class="secondary-btn filter-reset" type="button" @click="resetFilters">Reset filter</button>
      </div>
    </section>

    <p v-if="errorMessage" class="error-text no-print">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-text no-print">{{ successMessage }}</p>

    <section class="summary-grid">
      <article class="summary-card blue"><span>Total hasil</span><strong>{{ summary.total_attempts }}</strong><small>{{ summary.completed_attempts }} selesai</small></article>
      <article class="summary-card green"><span>Rata-rata skor</span><strong>{{ summary.average_score }}</strong><small>Skor akhir asesmen</small></article>
      <article class="summary-card purple"><span>Rata-rata akurasi</span><strong>{{ summary.average_accuracy }}%</strong><small>Jawaban benar</small></article>
      <article class="summary-card orange"><span>Pelanggaran tercatat</span><strong>{{ summary.total_violations }}</strong><small>Semua hasil selesai</small></article>
    </section>

    <section v-if="classStatistics.length" class="panel class-statistics-panel report-print-area">
      <div class="panel-heading">
        <div><h3>Statistik berdasarkan kelas</h3><p>Perbandingan capaian dari hasil yang sedang ditampilkan.</p></div>
      </div>
      <div class="class-statistics-wrap">
        <table class="class-statistics-table">
          <thead><tr><th>Kelas</th><th>Siswa</th><th>Hasil selesai</th><th>Rata-rata skor</th><th>Akurasi</th><th class="no-print">Waktu rata-rata</th><th>Pelanggaran</th></tr></thead>
          <tbody>
            <tr v-for="stat in classStatistics" :key="stat.class_id ?? 'none'">
              <td><strong>{{ stat.class_label }}</strong></td>
              <td>{{ stat.participant_count }}</td>
              <td>{{ stat.completed_attempts }}/{{ stat.total_attempts }}</td>
              <td class="score-cell">{{ stat.average_score }}</td>
              <td>{{ stat.average_accuracy }}%</td>
              <td class="no-print">{{ formatDuration(stat.average_time_seconds) }}</td>
              <td><span :class="['violation-badge', { clean: stat.total_violations === 0 }]">{{ stat.total_violations }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel table-panel report-print-area">
      <div class="panel-heading table-heading">
        <div><h3>Hasil siswa</h3><p>{{ rows.length }} hasil sesuai filter</p></div>
        <span class="print-note no-print">Ekspor PDF menggunakan dialog cetak browser.</span>
      </div>
      <div v-if="loading" class="panel-empty">Memuat laporan...</div>
      <div v-else-if="rows.length === 0" class="panel-empty">Belum ada hasil asesmen sesuai filter.</div>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>Siswa</th><th>Asesmen</th><th>Skor</th><th>Akurasi</th><th class="no-print">Durasi</th><th class="no-print">Mulai</th><th class="no-print">Selesai</th><th>Anti-cheat</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="row in rows" :key="row.attempt_id" class="report-row" @click="openDetail(row.attempt_id)">
              <td><strong>{{ row.participant_name }}</strong><small>{{ row.username }} · {{ row.participant_code }}</small></td>
              <td><strong>{{ row.subject_label }}</strong><small>{{ row.topic_label || 'Semua topik' }} · {{ row.class_label || 'Tanpa kelas' }}</small></td>
              <td class="score-cell">{{ row.final_score }}</td>
              <td>{{ row.accuracy }}%</td>
              <td class="no-print">{{ formatDuration(row.total_time_seconds) }}</td>
              <td class="no-print">{{ formatDateTime(row.started_at) }}</td>
              <td class="no-print">{{ formatDateTime(row.completed_at) }}</td>
              <td><span :class="['violation-badge', { clean: row.violation_count === 0 }]">{{ row.violation_count }} aktivitas</span></td>
              <td><span :class="['status-badge', `status-${row.status}`]">{{ statusLabel(row.status) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="detail" class="detail-backdrop no-print" @click.self="detail = null">
      <section class="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <div class="detail-header">
          <div><span class="eyebrow">DETAIL HASIL #{{ detail.attempt_id }}</span><h3 id="detail-title">{{ detail.participant_name }}</h3><p>{{ detail.username }} · {{ detail.participant_code }}</p></div>
          <button class="close-btn" type="button" aria-label="Tutup detail" @click="detail = null">×</button>
        </div>
        <div class="detail-meta"><span>{{ detail.subject_label }}</span><span>{{ detail.topic_label || 'Semua topik' }}</span><span>Mulai: {{ formatDateTime(detail.started_at) }}</span><span>Selesai: {{ formatDateTime(detail.completed_at) }}</span><span>Durasi: {{ formatDuration(detail.total_time_seconds) }}</span></div>
        <div class="detail-stats"><div><strong>{{ detail.final_score }}</strong><small>Skor akhir</small></div><div><strong>{{ detail.correct_count }}/{{ detail.total_questions }}</strong><small>Jawaban benar</small></div><div><strong>{{ detail.violation_count }}</strong><small>Aktivitas tercatat</small></div></div>
        <div class="detail-columns">
          <div><h4>Aktivitas anti-cheat</h4><p v-if="detail.integrity_events.length === 0" class="muted">Tidak ada aktivitas yang tercatat.</p><ul v-else class="event-list"><li v-for="event in detail.integrity_events" :key="event.id"><span>{{ eventLabel(event.event_type) }}</span><small>{{ formatDateTime(event.occurred_at) }}</small></li></ul></div>
          <div><h4>Jawaban</h4><p>{{ detail.answers.length }} dari {{ detail.total_questions }} soal telah dijawab.</p><p class="muted">Waktu pengerjaan: {{ formatDuration(detail.total_time_seconds) }}</p></div>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { fetchAdminCurriculum, fetchAdminReport, fetchAdminReportDetail, fetchAdminReportResetCount, resetAdminReportData } from '@/api/client';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import RuasSelect from '@/components/RuasSelect.vue';
import type { AdminReportClassStatistic, AdminReportDetail, AdminReportFilters, AdminReportRow, AdminReportSummary, CurriculumData } from '@/types';

const emptySummary: AdminReportSummary = { total_attempts: 0, completed_attempts: 0, in_progress_attempts: 0, abandoned_attempts: 0, average_score: 0, average_accuracy: 0, average_time_seconds: 0, total_violations: 0 };
const curriculum = reactive<CurriculumData>({ classes: [], assessment_types: [], subjects: [] });
const filters = reactive<AdminReportFilters>({ status: 'completed', search: '' });
const rows = ref<AdminReportRow[]>([]);
const summary = ref<AdminReportSummary>({ ...emptySummary });
const classStatistics = ref<AdminReportClassStatistic[]>([]);
const detail = ref<AdminReportDetail | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const filtersOpen = ref(false);
const resetCount = ref(0);
const resetting = ref(false);
const resetConfirmOpen = ref(false);
const statusOptions = [
  { value: 'completed', label: 'Selesai' },
  { value: 'all', label: 'Semua status' },
  { value: 'in_progress', label: 'Sedang berjalan' },
  { value: 'abandoned', label: 'Ditinggalkan' },
];
const classOptions = computed(() => [{ value: undefined, label: 'Semua kelas' }, ...curriculum.classes.map((item) => ({ value: item.id, label: `${item.label} · ${item.academic_year}` }))]);
const assessmentTypeOptions = computed(() => [{ value: undefined, label: 'Semua jenis' }, ...curriculum.assessment_types.map((item) => ({ value: item.id, label: item.label }))]);

const filteredSubjects = computed(() => curriculum.subjects.filter((subject) => {
  if (filters.class_id && subject.class_id !== filters.class_id) return false;
  if (filters.assessment_type_id && subject.assessment_type_id !== filters.assessment_type_id) return false;
  return true;
}));
const subjectOptions = computed(() => [{ value: undefined, label: 'Semua mata pelajaran' }, ...filteredSubjects.value.map((item) => ({ value: item.id, label: item.label }))]);
const activeFilterLabels = computed(() => {
  const labels: string[] = [];
  if (filters.status && filters.status !== 'completed') labels.push(statusOptions.find((option) => option.value === filters.status)?.label ?? 'Status');
  if (filters.class_id) labels.push(`Kelas: ${curriculum.classes.find((item) => item.id === filters.class_id)?.label ?? filters.class_id}`);
  if (filters.assessment_type_id) labels.push(`Jenis: ${curriculum.assessment_types.find((item) => item.id === filters.assessment_type_id)?.label ?? filters.assessment_type_id}`);
  if (filters.subject_id) labels.push(`Mapel: ${curriculum.subjects.find((item) => item.id === filters.subject_id)?.label ?? filters.subject_id}`);
  if (filters.from) labels.push(`Dari: ${filters.from}`);
  if (filters.to) labels.push(`Sampai: ${filters.to}`);
  if (filters.search) labels.push(`Cari: ${filters.search}`);
  return labels;
});

async function loadReport() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const data = await fetchAdminReport(filters);
    rows.value = data.rows;
    summary.value = data.summary;
    classStatistics.value = data.class_statistics;
    filtersOpen.value = false;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat laporan.';
  } finally {
    loading.value = false;
  }
}

async function loadResetCount() {
  try {
    resetCount.value = await fetchAdminReportResetCount();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat jumlah hasil asesmen.';
  }
}

const resetConfirmationMessage = computed(() => `Sebanyak ${resetCount.value} hasil asesmen, jawaban, dan catatan anti-cheat akan dihapus permanen. Data pengguna, soal, dan kurikulum tetap aman.`);

function openResetConfirmation() {
  if (resetCount.value > 0) resetConfirmOpen.value = true;
}

function closeResetConfirmation() {
  resetConfirmOpen.value = false;
}

async function resetReportData() {
  closeResetConfirmation();
  resetting.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const deleted = await resetAdminReportData('RESET HASIL ASESMEN');
    resetCount.value = 0;
    rows.value = [];
    classStatistics.value = [];
    summary.value = { ...emptySummary };
    detail.value = null;
    successMessage.value = `${deleted} hasil asesmen berhasil direset.`;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal mereset hasil asesmen.';
  } finally {
    resetting.value = false;
  }
}

async function openDetail(attemptId: number) {
  try {
    detail.value = await fetchAdminReportDetail(attemptId);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat detail hasil.';
  }
}

function resetFilters() {
  Object.assign(filters, { status: 'completed', subject_id: undefined, class_id: undefined, assessment_type_id: undefined, from: undefined, to: undefined, search: '' });
  filtersOpen.value = false;
  void loadReport();
}

function exportPdf() {
  window.print();
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${String(remainder).padStart(2, '0')}d` : `${remainder}d`;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function statusLabel(status: AdminReportRow['status']) {
  return { completed: 'Selesai', in_progress: 'Berjalan', abandoned: 'Ditinggalkan' }[status];
}

function eventLabel(type: string) {
  return { fullscreen_exit: 'Keluar dari layar penuh', tab_hidden: 'Berpindah tab', window_blur: 'Jendela tidak aktif', blocked_shortcut: 'Shortcut diblokir' }[type] || type;
}

onMounted(async () => {
  try {
    const data = await fetchAdminCurriculum();
    Object.assign(curriculum, data);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat filter kurikulum.';
  }
  await Promise.all([loadReport(), loadResetCount()]);
});
</script>

<style scoped>
.reports-panel { display: flex; flex-direction: column; gap: 18px; }
.panel { padding: 20px; border: 1px solid #e0e9f3; border-radius: 16px; background: #fff; box-shadow: 0 7px 18px rgba(31, 74, 126, .05); }
.report-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 20px; background: linear-gradient(115deg, #185db7, #2686df); color: #fff; }
.report-toolbar h2 { margin: 6px 0; color: #fff; font-size: 1.45rem; }
.report-toolbar p { color: rgba(255,255,255,.78); font-size: .86rem; }
.eyebrow { color: #78baff; font-size: .65rem; font-weight: 800; letter-spacing: .14em; }
.report-toolbar .eyebrow { color: #c7e4ff; }
.toolbar-actions { display: flex; gap: 8px; }
.primary-btn, .secondary-btn { border: 0; border-radius: 8px; padding: 10px 15px; font: inherit; font-size: .82rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
.primary-btn { color: #fff; background: #1e40af; }
.report-toolbar .primary-btn { color: #1555ae; background: #fff; }
.secondary-btn { color: #1e40af; background: #e8edf5; }
.report-toolbar .secondary-btn { color: #fff; border: 1px solid rgba(255,255,255,.4); background: rgba(255,255,255,.12); }
.danger-btn { border: 1px solid rgba(255, 216, 216, .62); border-radius: 8px; padding: 10px 13px; color: #fff; background: rgba(174, 34, 57, .76); font: inherit; font-size: .78rem; font-weight: 800; cursor: pointer; white-space: nowrap; }.danger-btn:hover:not(:disabled) { background: #a5223d; }.success-text { color: #23815d; font-size: .85rem; }
button:disabled { opacity: .55; cursor: default; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.panel-heading h3 { color: #1e40af; font-size: 1.04rem; }
.panel-heading p { margin-top: 4px; color: #71849b; font-size: .8rem; }
.filters-panel { transition: box-shadow .2s ease, background .2s ease; }.filters-panel.collapsed { padding-bottom: 15px; background: #fbfdff; box-shadow: 0 5px 14px rgba(31, 74, 126, .04); }.filter-toggle { flex: 0 0 auto; padding: 8px 11px; border: 1px solid #c5d9ef; border-radius: 9px; color: #246bc5; background: #fff; font: inherit; font-size: .74rem; font-weight: 800; cursor: pointer; }.filter-toggle:hover { background: #edf6ff; }.filter-toggle span { margin-left: 4px; font-size: .95rem; }
.active-filter-summary { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }.active-filter-summary span { padding: 4px 8px; border-radius: 999px; color: #2b63a3; background: #eaf3ff; font-size: .67rem; font-weight: 700; }
.filter-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }
label { display: flex; flex-direction: column; gap: 6px; color: #435d7d; font-size: .78rem; font-weight: 700; }
input, select { min-width: 0; width: 100%; padding: 10px 11px; border: 1px solid #d4e0ee; border-radius: 8px; color: #294c7a; background: #f9fbfe; font: inherit; font-weight: 400; }
.search-field { grid-column: span 2; }
.filter-reset { align-self: end; justify-self: start; }
.error-text { margin: -5px 0; color: #c53030; font-size: .85rem; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.summary-card { display: flex; min-height: 112px; flex-direction: column; justify-content: center; gap: 4px; padding: 17px; border: 1px solid #dfe8f2; border-radius: 14px; background: #fff; box-shadow: 0 7px 18px rgba(31,74,126,.05); }
.summary-card span, .summary-card small { color: #778aa3; font-size: .76rem; }
.summary-card strong { color: #1d4f94; font-size: 1.55rem; }
.summary-card.blue { border-top: 3px solid #2b78d0; }.summary-card.green { border-top: 3px solid #32a476; }.summary-card.purple { border-top: 3px solid #8162d4; }.summary-card.orange { border-top: 3px solid #e19a3c; }
.table-panel { overflow: hidden; padding: 0; }
.class-statistics-panel { overflow: hidden; }
.class-statistics-wrap { overflow-x: auto; margin-top: 16px; }
.class-statistics-table { width: 100%; min-width: 700px; border-collapse: collapse; }
.class-statistics-table th, .class-statistics-table td { padding: 11px 13px; border-bottom: 1px solid #edf2f7; color: #47617f; font-size: .76rem; text-align: left; white-space: nowrap; }
.class-statistics-table th { color: #7890aa; background: #f8fbff; font-size: .68rem; letter-spacing: .04em; text-transform: uppercase; }
.class-statistics-table td strong { color: #234d87; }
.class-statistics-table tbody tr:last-child td { border-bottom: 0; }
.table-heading { padding: 20px; border-bottom: 1px solid #e4ebf3; }
.print-note { color: #8495a9; font-size: .73rem; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 820px; }
th, td { padding: 13px 16px; border-bottom: 1px solid #edf2f7; color: #47617f; font-size: .78rem; text-align: left; vertical-align: middle; }
th { color: #7890aa; background: #f8fbff; font-size: .7rem; letter-spacing: .04em; text-transform: uppercase; }
td strong, td small { display: block; }.report-row { cursor: pointer; }.report-row:hover td { background: #f2f7ff; }.report-row td strong { color: #234d87; font-size: .82rem; }.report-row td small { margin-top: 3px; color: #8498b1; font-size: .7rem; }
.score-cell { color: #176cc2; font-size: 1rem; font-weight: 800; }
.violation-badge, .status-badge { display: inline-block; padding: 5px 8px; border-radius: 999px; font-size: .68rem; font-weight: 700; white-space: nowrap; }.violation-badge { color: #ad6c13; background: #fff3d9; }.violation-badge.clean { color: #247b59; background: #e2f7ed; }.status-completed { color: #247b59; background: #e2f7ed; }.status-in_progress { color: #2563a9; background: #e6f1ff; }.status-abandoned { color: #a34b4b; background: #ffebeb; }
.panel-empty { padding: 28px 20px; color: #77899f; text-align: center; }
.detail-backdrop { position: fixed; z-index: 20; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(16, 39, 73, .42); }
.detail-dialog { width: min(680px, 100%); max-height: min(720px, 90vh); overflow: auto; padding: 24px; border-radius: 18px; background: #fff; box-shadow: 0 24px 70px rgba(16,39,73,.25); }
.detail-header { display: flex; justify-content: space-between; gap: 14px; }.detail-header h3 { margin: 6px 0 3px; color: #173e7f; font-size: 1.35rem; }.detail-header p, .muted { color: #8294aa; font-size: .82rem; }.close-btn { width: 32px; height: 32px; border: 0; border-radius: 50%; color: #55718f; background: #eef4fb; font-size: 1.5rem; cursor: pointer; }
.detail-meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0 14px; }.detail-meta span { padding: 6px 9px; border-radius: 7px; color: #38649a; background: #edf5ff; font-size: .73rem; }.detail-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }.detail-stats div { padding: 13px; border-radius: 10px; background: #f2f7fc; text-align: center; }.detail-stats strong, .detail-stats small { display: block; }.detail-stats strong { color: #166bc0; font-size: 1.15rem; }.detail-stats small { margin-top: 3px; color: #7c90aa; font-size: .7rem; }.detail-columns { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-top: 22px; }.detail-columns h4 { margin-bottom: 9px; color: #315987; font-size: .85rem; }.event-list { display: flex; flex-direction: column; gap: 7px; padding: 0; list-style: none; }.event-list li { display: flex; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: 7px; background: #fff4e2; color: #946321; font-size: .75rem; }.event-list small { color: #b1844c; font-size: .68rem; }
@media (max-width: 900px) { .filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .report-toolbar { align-items: flex-start; flex-direction: column; }.toolbar-actions { width: 100%; }.toolbar-actions button { flex: 1; }.filters-panel .panel-heading { align-items: flex-start; }.filter-toggle { width: 100%; }.filters-panel .panel-heading { flex-direction: column; }.filter-grid { grid-template-columns: 1fr; }.search-field { grid-column: auto; }.filter-reset { width: 100%; }.summary-grid { grid-template-columns: 1fr 1fr; }.summary-card { min-height: 98px; padding: 13px; }.summary-card strong { font-size: 1.3rem; }.detail-columns { grid-template-columns: 1fr; } }
@media print {
  :global(body) { background: #fff !important; }
  :global(.admin-view) { padding: 0 !important; }
  :global(.admin-sidebar), :global(.dashboard-header), .no-print { display: none !important; }
  :global(.admin-layout) { display: block !important; }
  :global(.admin-content) { width: 100% !important; }
  .reports-panel { gap: 12px; }.report-toolbar { display: block; padding: 0 0 12px; color: #173e7f; background: #fff; box-shadow: none; }.report-toolbar h2 { color: #173e7f; }.report-toolbar p { color: #71849b; }.summary-grid { grid-template-columns: repeat(4, 1fr); }.panel { border-color: #d8e1eb; box-shadow: none; } .table-panel, .class-statistics-panel { overflow: visible; } table { min-width: 0; } th, td { padding: 8px; font-size: 9px; } .class-statistics-table { min-width: 0; } .class-statistics-table th, .class-statistics-table td { padding: 6px; font-size: 8px; } .report-row { cursor: default; }
}
</style>
