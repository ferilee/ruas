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
        <div class="filter-panel-actions">
          <span v-if="realtimeRefreshing" class="filter-live-status" aria-live="polite">Memperbarui realtime…</span>
          <button class="filter-toggle" type="button" :aria-expanded="filtersOpen" @click="filtersOpen = !filtersOpen">{{ filtersOpen ? 'Sembunyikan filter' : 'Tampilkan filter' }} <span aria-hidden="true">{{ filtersOpen ? '⌃' : '⌄' }}</span></button>
        </div>
      </div>
      <div v-show="filtersOpen" class="filter-grid">
        <label>Status<RuasSelect v-model="filters.status" :options="statusOptions" aria-label="Status laporan" @change="loadReport" /></label>
        <label>Kebijakan nilai<RuasSelect v-model="filters.score_policy" :options="scorePolicyOptions" aria-label="Kebijakan nilai laporan" @change="loadReport" /></label>
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
      <article class="summary-card blue"><span>Total attempts</span><strong>{{ summary.total_attempts }}</strong><small>{{ summary.completed_attempts }} selesai</small></article>
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
        <div><h3>Hasil siswa</h3><p>{{ reportGroups.length }} siswa/asesmen · {{ rows.length }} attempts sesuai filter</p></div>
        <div class="report-table-actions no-print"><label>Urutkan<RuasSelect v-model="reportSort" :options="reportSortOptions" aria-label="Urutkan hasil siswa" /></label><span class="print-note">Ekspor PDF menggunakan dialog cetak browser.</span></div>
      </div>
      <div v-if="loading" class="panel-empty">Memuat laporan...</div>
      <div v-else-if="rows.length === 0" class="panel-empty">Belum ada hasil asesmen sesuai filter.</div>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>Siswa</th><th>Asesmen</th><th>Nilai resmi</th><th>Akurasi</th><th class="no-print">Durasi</th><th class="no-print">Mulai</th><th class="no-print">Selesai</th><th>Anti-cheat</th><th>Status</th></tr></thead>
          <tbody>
            <template v-for="group in reportGroups" :key="group.key">
              <tr class="report-row" @click="openReportGroup(group)">
                <td><strong>{{ group.official.participant_name }}</strong><small>{{ group.official.username }} · {{ group.official.participant_code }}</small><span v-if="group.attempts.length > 1" class="attempt-count">{{ group.attempts.length }} attempts · klik untuk riwayat</span></td>
                <td><strong>{{ group.official.subject_label }}</strong><small>{{ group.official.topic_label || 'Semua topik' }} · {{ group.official.class_label || 'Tanpa kelas' }}</small></td>
                <td class="score-cell">{{ group.official.final_score }}<small>{{ scorePolicyLabel }}</small></td>
                <td>{{ group.official.accuracy }}%</td>
                <td class="no-print">{{ formatDuration(group.official.total_time_seconds) }}</td>
                <td class="no-print">{{ formatDateTime(group.official.started_at) }}</td>
                <td class="no-print">{{ formatDateTime(group.official.completed_at) }}</td>
                <td><span :class="['violation-badge', { clean: group.official.violation_count === 0 }]">{{ group.official.violation_count }} aktivitas</span></td>
                <td><span :class="['status-badge', `status-${group.official.status}`]">{{ statusLabel(group.official.status) }}</span></td>
              </tr>
              <tr v-if="expandedGroups[group.key]" class="history-row">
                <td colspan="9">
                  <div class="attempt-history">
                    <strong>Riwayat attempts {{ group.official.participant_name }}</strong>
                    <div class="attempt-history-list">
                      <button v-for="attempt in group.attempts" :key="attempt.attempt_id" type="button" @click.stop="openDetail(attempt.attempt_id)">
                        <span>Attempt #{{ attempt.attempt_id }} · {{ formatDateTime(attempt.started_at) }}</span><b>{{ attempt.final_score }}</b><small>{{ statusLabel(attempt.status) }} · Lihat detail</small>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
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
        <div class="detail-stats"><div><strong>{{ detail.final_score }}</strong><small>Skor akhir</small></div><div><strong>{{ detail.correct_count }}/{{ detail.total_questions }}</strong><small>Jawaban benar</small></div><div><strong>{{ detail.unanswered_question_numbers.length }}</strong><small>Tidak dijawab</small></div><div><strong>{{ detail.violation_count }}</strong><small>Aktivitas tercatat</small></div></div>
        <section class="analysis-summary">
          <div class="analysis-summary-heading"><div><h4>Analisis per nomor soal</h4><p>Gunakan ringkasan ini untuk melihat bagian yang sudah dikuasai dan yang perlu diulang.</p></div><RuasSelect v-model="analysisFilter" :options="analysisFilterOptions" aria-label="Filter hasil analisis" /></div>
          <div class="analysis-counts">
            <div class="analysis-count correct"><strong>{{ detail.correct_question_numbers.length }}</strong><span>Benar</span><small>{{ questionNumbers(detail.correct_question_numbers) }}</small></div>
            <div class="analysis-count incorrect"><strong>{{ detail.incorrect_question_numbers.length }}</strong><span>Salah</span><small>{{ questionNumbers(detail.incorrect_question_numbers) }}</small></div>
            <div class="analysis-count unanswered"><strong>{{ detail.unanswered_question_numbers.length }}</strong><span>Tidak dijawab</span><small>{{ questionNumbers(detail.unanswered_question_numbers) }}</small></div>
          </div>
          <div v-if="filteredAnalysis.length" class="question-analysis-list">
            <article v-for="question in filteredAnalysis" :key="question.question_id" :class="['question-analysis-item', `analysis-${question.status}`]">
              <div class="question-analysis-title"><strong>Soal {{ question.question_number }}</strong><span>{{ question.topic_label }}</span><b>{{ analysisStatusLabel(question.status) }}</b></div>
              <p>{{ question.question_text }}</p>
              <div class="answer-comparison"><span><small>Jawaban siswa</small>{{ question.selected_texts.length ? question.selected_texts.join(', ') : question.selected_keys.length ? question.selected_keys.join(', ') : 'Tidak dijawab' }}</span><span><small>Kunci jawaban</small>{{ question.correct_texts.join(', ') || question.correct_keys.join(', ') || '—' }}</span></div>
            </article>
          </div>
          <p v-else class="muted">Tidak ada soal pada filter ini.</p>
        </section>
        <div class="detail-columns">
          <div><h4>Aktivitas anti-cheat</h4><p v-if="detail.integrity_events.length === 0" class="muted">Tidak ada aktivitas yang tercatat.</p><ul v-else class="event-list"><li v-for="event in detail.integrity_events" :key="event.id"><span>{{ eventLabel(event.event_type) }}</span><small>{{ formatDateTime(event.occurred_at) }}</small></li></ul></div>
          <div><h4>Jawaban</h4><p>{{ detail.answers.length }} dari {{ detail.total_questions }} soal telah dijawab.</p><p class="muted">Waktu pengerjaan: {{ formatDuration(detail.total_time_seconds) }}</p></div>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { fetchAdminCurriculum, fetchAdminReport, fetchAdminReportDetail, fetchAdminReportResetCount, resetAdminReportData } from '@/api/client';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import RuasSelect from '@/components/RuasSelect.vue';
import type { AdminReportClassStatistic, AdminReportDetail, AdminReportFilters, AdminReportQuestionStatus, AdminReportRow, AdminReportSummary, CurriculumData } from '@/types';
import { ADMIN_REALTIME_EVENT, type AdminRealtimeEvent } from '@/lib/admin-realtime';

const emptySummary: AdminReportSummary = { total_attempts: 0, completed_attempts: 0, in_progress_attempts: 0, abandoned_attempts: 0, average_score: 0, average_accuracy: 0, average_time_seconds: 0, total_violations: 0 };
const curriculum = reactive<CurriculumData>({ classes: [], assessment_types: [], subjects: [] });
const filters = reactive<AdminReportFilters>({ status: 'completed', score_policy: 'best', search: '' });
const rows = ref<AdminReportRow[]>([]);
const summary = ref<AdminReportSummary>({ ...emptySummary });
const classStatistics = ref<AdminReportClassStatistic[]>([]);
const detail = ref<AdminReportDetail | null>(null);
const analysisFilter = ref<'all' | AdminReportQuestionStatus>('all');
const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const filtersOpen = ref(false);
const realtimeRefreshing = ref(false);
const resetCount = ref(0);
const resetting = ref(false);
const resetConfirmOpen = ref(false);
const statusOptions = [
  { value: 'completed', label: 'Selesai' },
  { value: 'all', label: 'Semua status' },
  { value: 'in_progress', label: 'Sedang berjalan' },
  { value: 'abandoned', label: 'Ditinggalkan' },
];
const scorePolicyOptions = [
  { value: 'best', label: 'Nilai terbaik' },
  { value: 'latest', label: 'Nilai terakhir' },
  { value: 'average', label: 'Nilai rata-rata' },
];
const scorePolicyLabel = computed(() => scorePolicyOptions.find((option) => option.value === filters.score_policy)?.label ?? 'Nilai terbaik');
type ReportSort = 'name_asc' | 'name_desc' | 'score_desc' | 'score_asc';
const reportSort = ref<ReportSort>('name_asc');
const reportSortOptions = [
  { value: 'name_asc', label: 'Nama A–Z' },
  { value: 'name_desc', label: 'Nama Z–A' },
  { value: 'score_desc', label: 'Nilai tertinggi' },
  { value: 'score_asc', label: 'Nilai terendah' },
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
  labels.push(`Kebijakan: ${scorePolicyLabel.value}`);
  return labels;
});
const analysisFilterOptions = [
  { value: 'all', label: 'Semua soal' },
  { value: 'correct', label: 'Benar saja' },
  { value: 'incorrect', label: 'Salah saja' },
  { value: 'unanswered', label: 'Tidak dijawab' },
];
const filteredAnalysis = computed(() => detail.value?.question_analysis.filter((question) => analysisFilter.value === 'all' || question.status === analysisFilter.value) ?? []);
const expandedGroups = reactive<Record<string, boolean>>({});
const reportGroups = computed(() => {
  const grouped = new Map<string, AdminReportRow[]>();
  for (const row of rows.value) {
    const key = `${row.participant_id}:${row.subject_id}:${row.topic_id ?? 'none'}`;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }

  const result = [...grouped.entries()].map(([key, attempts]) => {
    const completed = attempts.filter((attempt) => attempt.status === 'completed');
    const ordered = [...(completed.length ? completed : attempts)].sort((first, second) => new Date(second.completed_at ?? second.started_at).getTime() - new Date(first.completed_at ?? first.started_at).getTime() || second.attempt_id - first.attempt_id);
    const latest = ordered[0];
    let official = latest;
    if (filters.score_policy === 'best' && completed.length) official = [...completed].sort((first, second) => second.final_score - first.final_score || new Date(second.completed_at ?? second.started_at).getTime() - new Date(first.completed_at ?? first.started_at).getTime())[0];
    if (filters.score_policy === 'average' && completed.length) {
      const average = (values: number[]) => Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
      official = { ...latest, final_score: average(completed.map((attempt) => attempt.final_score)), accuracy: average(completed.map((attempt) => attempt.accuracy)), total_time_seconds: Math.round(average(completed.map((attempt) => attempt.total_time_seconds))), violation_count: Math.round(average(completed.map((attempt) => attempt.violation_count))) };
    }
    return { key, attempts: [...attempts].sort((first, second) => new Date(second.started_at).getTime() - new Date(first.started_at).getTime()), official };
  });
  return result.sort((first, second) => {
    if (reportSort.value === 'name_asc' || reportSort.value === 'name_desc') {
      const direction = reportSort.value === 'name_asc' ? 1 : -1;
      return direction * first.official.participant_name.localeCompare(second.official.participant_name, 'id', { sensitivity: 'base' }) || first.official.subject_label.localeCompare(second.official.subject_label, 'id');
    }
    const direction = reportSort.value === 'score_desc' ? -1 : 1;
    return direction * (first.official.final_score - second.official.final_score) || first.official.participant_name.localeCompare(second.official.participant_name, 'id', { sensitivity: 'base' });
  });
});

async function loadReport() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const data = await fetchAdminReport(filters);
    rows.value = data.rows;
    summary.value = data.summary;
    classStatistics.value = data.class_statistics;
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
    analysisFilter.value = 'all';
    detail.value = await fetchAdminReportDetail(attemptId);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat detail hasil.';
  }
}

function questionNumbers(numbers: number[]) {
  return numbers.length ? numbers.join(', ') : '—';
}

function analysisStatusLabel(status: AdminReportQuestionStatus) {
  return { correct: 'Benar', incorrect: 'Salah', unanswered: 'Tidak dijawab' }[status];
}

function resetFilters() {
  Object.assign(filters, { status: 'completed', score_policy: 'best', subject_id: undefined, class_id: undefined, assessment_type_id: undefined, from: undefined, to: undefined, search: '' });
  filtersOpen.value = false;
  void loadReport();
}

function openReportGroup(group: (typeof reportGroups.value)[number]) {
  if (group.attempts.length === 1) {
    void openDetail(group.attempts[0].attempt_id);
    return;
  }
  expandedGroups[group.key] = !expandedGroups[group.key];
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

function handleRealtime(event: Event) {
  const detail = (event as CustomEvent<AdminRealtimeEvent>).detail;
  if (detail?.resource !== 'attempts' && detail?.resource !== 'reports') return;
  realtimeRefreshing.value = true;
  void Promise.all([loadReport(), loadResetCount()]).finally(() => {
    realtimeRefreshing.value = false;
  });
}

onMounted(async () => {
  try {
    const data = await fetchAdminCurriculum();
    Object.assign(curriculum, data);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat filter kurikulum.';
  }
  await Promise.all([loadReport(), loadResetCount()]);
  window.addEventListener(ADMIN_REALTIME_EVENT, handleRealtime);
});

onUnmounted(() => window.removeEventListener(ADMIN_REALTIME_EVENT, handleRealtime));
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
.filters-panel { transition: box-shadow .2s ease, background .2s ease; }.filters-panel.collapsed { padding-bottom: 15px; background: #fbfdff; box-shadow: 0 5px 14px rgba(31, 74, 126, .04); }.filter-panel-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }.filter-live-status { color: #2875c8; font-size: .7rem; font-weight: 700; white-space: nowrap; }.filter-toggle { flex: 0 0 auto; padding: 8px 11px; border: 1px solid #c5d9ef; border-radius: 9px; color: #246bc5; background: #fff; font: inherit; font-size: .74rem; font-weight: 800; cursor: pointer; }.filter-toggle:hover { background: #edf6ff; }.filter-toggle span { margin-left: 4px; font-size: .95rem; }
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
.table-heading { padding: 20px; border-bottom: 1px solid #e4ebf3; }.report-table-actions { display: flex; align-items: flex-end; gap: 12px; }.report-table-actions label { min-width: 145px; color: #607693; font-size: .68rem; }.report-table-actions :deep(.ruas-select) { margin-top: 5px; }
.print-note { color: #8495a9; font-size: .73rem; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 820px; }
th, td { padding: 13px 16px; border-bottom: 1px solid #edf2f7; color: #47617f; font-size: .78rem; text-align: left; vertical-align: middle; }
th { color: #7890aa; background: #f8fbff; font-size: .7rem; letter-spacing: .04em; text-transform: uppercase; }
td strong, td small { display: block; }.report-row { cursor: pointer; }.report-row:hover td { background: #f2f7ff; }.report-row td strong { color: #234d87; font-size: .82rem; }.report-row td small { margin-top: 3px; color: #8498b1; font-size: .7rem; }
.score-cell { color: #176cc2; font-size: 1rem; font-weight: 800; }.score-cell small { margin-top: 3px; color: #7890aa; font-size: .62rem; font-weight: 600; }.attempt-count { display: block; margin-top: 5px; color: #286fc2; font-size: .66rem; font-weight: 700; }
.history-row td { padding: 0 16px 13px; background: #f8fbff; }.attempt-history { padding: 13px; border: 1px solid #dce8f5; border-radius: 10px; background: #fff; }.attempt-history > strong { color: #315987; font-size: .75rem; }.attempt-history-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 9px; }.attempt-history-list button { display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; min-width: 220px; padding: 9px 10px; border: 1px solid #d9e6f3; border-radius: 8px; color: #496785; background: #f7fbff; font: inherit; font-size: .68rem; text-align: left; cursor: pointer; }.attempt-history-list button:hover { border-color: #8bb9e9; background: #edf6ff; }.attempt-history-list button b { grid-row: span 2; align-self: center; color: #176cc2; font-size: .95rem; }.attempt-history-list button small { color: #8294aa; font-size: .63rem; }
.violation-badge, .status-badge { display: inline-block; padding: 5px 8px; border-radius: 999px; font-size: .68rem; font-weight: 700; white-space: nowrap; }.violation-badge { color: #ad6c13; background: #fff3d9; }.violation-badge.clean { color: #247b59; background: #e2f7ed; }.status-completed { color: #247b59; background: #e2f7ed; }.status-in_progress { color: #2563a9; background: #e6f1ff; }.status-abandoned { color: #a34b4b; background: #ffebeb; }
.panel-empty { padding: 28px 20px; color: #77899f; text-align: center; }
.detail-backdrop { position: fixed; z-index: 20; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(16, 39, 73, .42); }
.detail-dialog { width: min(680px, 100%); max-height: min(720px, 90vh); overflow: auto; padding: 24px; border-radius: 18px; background: #fff; box-shadow: 0 24px 70px rgba(16,39,73,.25); }
.detail-header { display: flex; justify-content: space-between; gap: 14px; }.detail-header h3 { margin: 6px 0 3px; color: #173e7f; font-size: 1.35rem; }.detail-header p, .muted { color: #8294aa; font-size: .82rem; }.close-btn { width: 32px; height: 32px; border: 0; border-radius: 50%; color: #55718f; background: #eef4fb; font-size: 1.5rem; cursor: pointer; }
.detail-meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0 14px; }.detail-meta span { padding: 6px 9px; border-radius: 7px; color: #38649a; background: #edf5ff; font-size: .73rem; }.detail-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; }.detail-stats div { padding: 13px; border-radius: 10px; background: #f2f7fc; text-align: center; }.detail-stats strong, .detail-stats small { display: block; }.detail-stats strong { color: #166bc0; font-size: 1.15rem; }.detail-stats small { margin-top: 3px; color: #7c90aa; font-size: .7rem; }.detail-columns { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-top: 22px; }.detail-columns h4 { margin-bottom: 9px; color: #315987; font-size: .85rem; }.event-list { display: flex; flex-direction: column; gap: 7px; padding: 0; list-style: none; }.event-list li { display: flex; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: 7px; background: #fff4e2; color: #946321; font-size: .75rem; }.event-list small { color: #b1844c; font-size: .68rem; }
.analysis-summary { margin-top: 22px; padding-top: 18px; border-top: 1px solid #e6edf5; }.analysis-summary-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }.analysis-summary-heading h4 { color: #315987; font-size: .9rem; }.analysis-summary-heading p { margin-top: 4px; color: #8294aa; font-size: .75rem; }.analysis-summary-heading :deep(.ruas-select) { width: 145px; flex: 0 0 auto; }.analysis-counts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0; }.analysis-count { min-width: 0; padding: 10px; border-radius: 10px; background: #f4f8fc; }.analysis-count strong, .analysis-count span, .analysis-count small { display: block; }.analysis-count strong { font-size: 1.1rem; }.analysis-count span { margin-top: 2px; font-size: .72rem; font-weight: 800; }.analysis-count small { overflow: hidden; margin-top: 6px; color: #7c90aa; font-size: .68rem; text-overflow: ellipsis; white-space: nowrap; }.analysis-count.correct { border-left: 3px solid #2fa474; }.analysis-count.correct strong, .analysis-count.correct span { color: #21815e; }.analysis-count.incorrect { border-left: 3px solid #d56b6b; }.analysis-count.incorrect strong, .analysis-count.incorrect span { color: #b24b55; }.analysis-count.unanswered { border-left: 3px solid #d79a3b; }.analysis-count.unanswered strong, .analysis-count.unanswered span { color: #a86d1b; }.question-analysis-list { display: flex; flex-direction: column; gap: 8px; max-height: 330px; overflow: auto; padding-right: 3px; }.question-analysis-item { padding: 11px 12px; border: 1px solid #e2eaf3; border-left: 3px solid #b8c7d9; border-radius: 9px; background: #fbfdff; }.question-analysis-item.analysis-correct { border-left-color: #2fa474; }.question-analysis-item.analysis-incorrect { border-left-color: #d56b6b; }.question-analysis-item.analysis-unanswered { border-left-color: #d79a3b; }.question-analysis-title { display: flex; align-items: center; gap: 7px; }.question-analysis-title strong { color: #254d83; font-size: .77rem; }.question-analysis-title span { overflow: hidden; color: #8294aa; font-size: .68rem; text-overflow: ellipsis; white-space: nowrap; }.question-analysis-title b { margin-left: auto; padding: 3px 6px; border-radius: 999px; color: #55718f; background: #edf3f9; font-size: .62rem; white-space: nowrap; }.analysis-correct .question-analysis-title b { color: #21815e; background: #e2f7ed; }.analysis-incorrect .question-analysis-title b { color: #b24b55; background: #ffebeb; }.analysis-unanswered .question-analysis-title b { color: #a86d1b; background: #fff3d9; }.question-analysis-item p { margin: 8px 0; color: #405a76; font-size: .77rem; line-height: 1.45; }.answer-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }.answer-comparison span { padding: 7px 8px; border-radius: 7px; color: #405a76; background: #f1f6fb; font-size: .7rem; }.answer-comparison small { display: block; margin-bottom: 3px; color: #8497ad; font-size: .63rem; font-weight: 700; }
@media (max-width: 900px) { .filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .report-toolbar { align-items: flex-start; flex-direction: column; }.toolbar-actions { width: 100%; }.toolbar-actions button { flex: 1; }.filters-panel .panel-heading { align-items: flex-start; }.filter-toggle { width: 100%; }.filters-panel .panel-heading { flex-direction: column; }.filter-grid { grid-template-columns: 1fr; }.search-field { grid-column: auto; }.filter-reset { width: 100%; }.summary-grid { grid-template-columns: 1fr 1fr; }.summary-card { min-height: 98px; padding: 13px; }.summary-card strong { font-size: 1.3rem; }.detail-stats { grid-template-columns: 1fr 1fr; }.detail-columns { grid-template-columns: 1fr; }.analysis-summary-heading { flex-direction: column; }.analysis-summary-heading :deep(.ruas-select) { width: 100%; }.analysis-counts { grid-template-columns: 1fr; }.answer-comparison { grid-template-columns: 1fr; }.table-heading { align-items: flex-start; flex-direction: column; }.report-table-actions { width: 100%; align-items: stretch; flex-direction: column; }.report-table-actions label { width: 100%; }.report-table-actions .print-note { display: none; } }
@media print {
  :global(body) { background: #fff !important; }
  :global(.admin-view) { padding: 0 !important; }
  :global(.admin-sidebar), :global(.dashboard-header), .no-print { display: none !important; }
  :global(.admin-layout) { display: block !important; }
  :global(.admin-content) { width: 100% !important; }
  .reports-panel { gap: 12px; }.report-toolbar { display: block; padding: 0 0 12px; color: #173e7f; background: #fff; box-shadow: none; }.report-toolbar h2 { color: #173e7f; }.report-toolbar p { color: #71849b; }.summary-grid { grid-template-columns: repeat(4, 1fr); }.panel { border-color: #d8e1eb; box-shadow: none; } .table-panel, .class-statistics-panel { overflow: visible; } table { min-width: 0; } th, td { padding: 8px; font-size: 9px; } .class-statistics-table { min-width: 0; } .class-statistics-table th, .class-statistics-table td { padding: 6px; font-size: 8px; } .report-row { cursor: default; }
}
</style>
