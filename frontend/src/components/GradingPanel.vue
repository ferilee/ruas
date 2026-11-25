<template>
  <section class="grading-panel">
    <div class="grading-header">
      <div>
        <span class="eyebrow">PENILAIAN MANUAL</span>
        <h2>Penilaian Uraian Singkat</h2>
        <p>Jawaban uraian dari asesmen yang sudah selesai dan masih menunggu nilai. Skor siswa bersifat sementara sampai semua uraian pada hasilnya selesai dinilai.</p>
      </div>
      <button class="secondary-btn" type="button" :disabled="loading" @click="loadQueue">Muat ulang</button>
    </div>

    <p v-if="errorMessage" class="error-text" role="alert">{{ errorMessage }}</p>

    <template v-if="!detail">
      <div v-if="loading" class="panel-empty">Memuat antrean penilaian...</div>
      <div v-else-if="queue.length === 0" class="panel-empty">Tidak ada jawaban uraian yang menunggu penilaian. Semua hasil sudah final.</div>
      <div v-else class="grading-queue">
        <button v-for="row in queue" :key="row.attempt_id" type="button" class="grading-queue-row" @click="openDetail(row.attempt_id)">
          <span class="grading-queue-student">
            <strong>{{ row.participant_name }}</strong>
            <small>{{ row.participant_code }} · {{ row.class_label || 'Tanpa kelas' }}</small>
            <small>{{ row.subject_label }} · {{ row.topic_label || 'Tanpa topik' }}</small>
          </span>
          <span class="grading-queue-meta">
            <span class="grading-pending-badge">{{ row.grading_pending_count }} uraian menunggu</span>
            <small>Selesai {{ formatDateTime(row.completed_at) }} · Skor sementara {{ row.final_score }}</small>
          </span>
          <span class="grading-queue-arrow" aria-hidden="true">→</span>
        </button>
      </div>
    </template>

    <template v-else>
      <div class="grading-detail-bar">
        <button class="secondary-btn" type="button" @click="closeDetail">‹ Kembali ke antrean</button>
        <div class="grading-detail-summary">
          <strong>{{ detail.attempt.participant_name }}</strong>
          <span>{{ detail.attempt.subject_label }} · {{ detail.attempt.topic_label || 'Tanpa topik' }} · {{ detail.attempt.class_label || 'Tanpa kelas' }}</span>
          <span>Skor saat ini <strong>{{ currentScore }}</strong> · {{ detail.grading_pending_count }} uraian belum dinilai</span>
        </div>
      </div>

      <p v-if="detail.grading_pending_count === 0" class="grading-done-note" role="status">Semua jawaban uraian pada hasil ini sudah dinilai. Skor siswa sudah final.</p>

      <article v-for="answer in detail.answers" :key="answer.answer_id" class="grading-answer-card">
        <div class="grading-answer-heading">
          <strong>Soal #{{ answer.question_id }}</strong>
          <span v-if="answer.pending" class="grading-pending-badge">Menunggu penilaian</span>
          <span v-else class="grading-graded-badge">Sudah dinilai{{ answer.graded_by ? ` oleh ${answer.graded_by}` : '' }} · {{ Math.round((answer.score_fraction ?? 0) * 100) }}</span>
        </div>
        <div class="grading-question"><MathText :text="answer.question_text" /></div>
        <div class="grading-guide">
          <strong>Pedoman penilaian <span>(khusus guru)</span></strong>
          <p>{{ answer.grading_guide || 'Tidak ada pedoman tersimpan untuk soal ini.' }}</p>
        </div>
        <div class="grading-student-answer">
          <strong>Jawaban siswa</strong>
          <p>{{ answer.answer_text || '(Jawaban kosong)' }}</p>
        </div>
        <form class="grading-score-form" @submit.prevent="saveScore(answer)">
          <label>
            Nilai (0–100)
            <input v-model.number="scoreInputs[answer.answer_id]" type="number" min="0" max="100" step="1" required inputmode="numeric" />
          </label>
          <button class="primary-btn" type="submit" :disabled="savingAnswerId === answer.answer_id">
            {{ savingAnswerId === answer.answer_id ? 'Menyimpan...' : answer.pending ? 'Simpan nilai' : 'Perbarui nilai' }}
          </button>
          <span v-if="savedAnswerId === answer.answer_id" class="grading-saved-note" role="status">Tersimpan — skor siswa sudah dihitung ulang.</span>
        </form>
      </article>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import MathText from '@/components/MathText.vue';
import { fetchGradingDetail, fetchGradingQueue, gradeEssayAnswer } from '@/api/client';
import type { GradingDetail, GradingEssayAnswer, GradingQueueRow } from '@/types';

const queue = ref<GradingQueueRow[]>([]);
const detail = ref<GradingDetail | null>(null);
const currentScore = ref(0);
const scoreInputs = reactive<Record<number, number | undefined>>({});
const loading = ref(false);
const savingAnswerId = ref<number | null>(null);
const savedAnswerId = ref<number | null>(null);
const errorMessage = ref('');

async function loadQueue() {
  loading.value = true;
  errorMessage.value = '';
  try {
    queue.value = await fetchGradingQueue();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat antrean penilaian.';
  } finally {
    loading.value = false;
  }
}

async function openDetail(attemptId: number) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const loaded = await fetchGradingDetail(attemptId);
    detail.value = loaded;
    currentScore.value = loaded.attempt.final_score;
    for (const answer of loaded.answers) {
      scoreInputs[answer.answer_id] = answer.score_fraction === null || answer.score_fraction === undefined
        ? undefined
        : Math.round(answer.score_fraction * 100);
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat rincian penilaian.';
  } finally {
    loading.value = false;
  }
}

function closeDetail() {
  detail.value = null;
  savedAnswerId.value = null;
  void loadQueue();
}

async function saveScore(answer: GradingEssayAnswer) {
  if (!detail.value) return;
  const score = scoreInputs[answer.answer_id];
  if (score === undefined || score === null || Number.isNaN(score) || score < 0 || score > 100) {
    errorMessage.value = 'Nilai harus berupa angka 0 sampai 100.';
    return;
  }
  savingAnswerId.value = answer.answer_id;
  errorMessage.value = '';
  try {
    const result = await gradeEssayAnswer(detail.value.attempt.attempt_id, answer.answer_id, Math.round(score));
    answer.score_fraction = result.score_fraction;
    answer.graded_by = result.graded_by;
    answer.graded_at = result.graded_at;
    answer.pending = false;
    detail.value.grading_pending_count = result.grading_pending_count;
    currentScore.value = result.aggregates.final_score;
    savedAnswerId.value = answer.answer_id;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal menyimpan nilai.';
  } finally {
    savingAnswerId.value = null;
  }
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

onMounted(() => {
  void loadQueue();
});
</script>

<style scoped>
.grading-panel { display: flex; flex-direction: column; gap: 18px; }
.grading-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 24px; border: 1px solid #dce7f4; border-radius: 16px; color: #1d3557; background: #fff; box-shadow: 0 7px 18px rgba(31, 74, 126, .05); }
.grading-header h2 { margin-top: 6px; color: #172b4d; font-size: 1.45rem; }
.grading-header p { margin-top: 5px; max-width: 640px; color: #66788e; font-size: .84rem; line-height: 1.55; }
.grading-header .eyebrow { color: #7350c7; }
.grading-header .secondary-btn { flex: 0 0 auto; border: 1px solid #cbd9e8; color: #365678; background: #fff; }
.panel-empty { padding: 28px; border: 1px dashed #cbd9e8; border-radius: 14px; color: #66788e; background: #fff; text-align: center; font-size: .86rem; }
.grading-queue { display: flex; flex-direction: column; gap: 10px; }
.grading-queue-row { display: flex; align-items: center; gap: 16px; width: 100%; padding: 16px 18px; border: 1px solid #dce7f4; border-radius: 14px; color: #1d3557; background: #fff; font: inherit; text-align: left; cursor: pointer; }
.grading-queue-row:hover { border-color: #9db9d8; }
.grading-queue-student { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; }
.grading-queue-student strong { color: #234978; font-size: .95rem; }
.grading-queue-student small { color: #66788e; font-size: .74rem; }
.grading-queue-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.grading-queue-meta small { color: #66788e; font-size: .72rem; }
.grading-pending-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; color: #7a5b12; background: #fdf0cd; font-size: .7rem; font-weight: 800; white-space: nowrap; }
.grading-graded-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; color: #256b4a; background: #dff3e7; font-size: .7rem; font-weight: 800; white-space: nowrap; }
.grading-queue-arrow { color: #7b91ad; font-size: 1.1rem; }
.grading-detail-bar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.grading-detail-bar .secondary-btn { border: 1px solid #cbd9e8; color: #365678; background: #fff; }
.grading-detail-summary { display: flex; flex-direction: column; gap: 2px; color: #66788e; font-size: .8rem; }
.grading-detail-summary strong { color: #234978; }
.grading-done-note { margin: 0; padding: 12px 16px; border: 1px solid #bfe3cf; border-radius: 12px; color: #256b4a; background: #f1fbf5; font-size: .84rem; }
.grading-answer-card { display: flex; flex-direction: column; gap: 12px; padding: 20px; border: 1px solid #dce7f4; border-radius: 16px; background: #fff; }
.grading-answer-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #234978; }
.grading-question { color: #24384b; font-size: .95rem; line-height: 1.7; }
.grading-guide { padding: 12px 14px; border: 1px solid #e3d5f5; border-radius: 12px; color: #4c3480; background: #f7f2ff; font-size: .83rem; line-height: 1.6; }
.grading-guide strong { display: block; margin-bottom: 4px; font-size: .78rem; }
.grading-guide strong span { color: #8a76b8; font-weight: 600; }
.grading-guide p { margin: 0; white-space: pre-wrap; }
.grading-student-answer { padding: 12px 14px; border: 1px solid #dce7f4; border-radius: 12px; color: #24384b; background: #f8fbff; font-size: .88rem; line-height: 1.65; }
.grading-student-answer strong { display: block; margin-bottom: 4px; color: #234978; font-size: .78rem; }
.grading-student-answer p { margin: 0; white-space: pre-wrap; }
.grading-score-form { display: flex; align-items: end; gap: 12px; flex-wrap: wrap; }
.grading-score-form label { display: flex; flex-direction: column; gap: 6px; color: #365678; font-size: .78rem; font-weight: 700; }
.grading-score-form input { width: 130px; min-height: 42px; padding: 8px 12px; border: 1px solid #cbd9e8; border-radius: 10px; color: #1d3557; background: #fff; font: inherit; }
.grading-score-form input:focus { border-color: #7350c7; outline: none; box-shadow: 0 0 0 3px rgba(115, 80, 199, .14); }
.grading-saved-note { color: #256b4a; font-size: .78rem; font-weight: 700; }
.error-text { color: #b33d45; font-size: .84rem; }
@media (max-width: 700px) {
  .grading-header { flex-direction: column; }
  .grading-queue-row { flex-wrap: wrap; }
  .grading-queue-meta { align-items: flex-start; }
}
</style>
