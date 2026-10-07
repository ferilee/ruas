<template>
  <div class="topic-view">
    <router-link to="/" class="topic-back">&larr; Kembali</router-link>

    <h1 class="topic-title">{{ subjectLabel || 'Pilih Topik' }}</h1>
    <p class="topic-subtitle">Pilih topik yang ingin kamu kerjakan.</p>

    <div v-if="loading || scheduleLoading" class="topic-loading">Memuat...</div>

    <div v-else-if="error" class="topic-state">
      <p class="topic-error">{{ error }}</p>
      <button class="topic-action-btn" @click="loadTopicsData">Coba Lagi</button>
    </div>

    <div v-else-if="topics.length === 0" class="topic-state">
      <p class="topic-empty">Belum ada topik untuk mata pelajaran ini.</p>
      <button class="topic-action-btn" @click="loadTopicsData">Muat Ulang</button>
    </div>

    <template v-else>
      <div v-if="schedule && !schedule.is_open" class="topic-schedule-notice" role="status">
        Asesmen belum dibuka. Jadwal mulai {{ formatStartAt(schedule.start_at) }}.
        <strong>{{ formatRemaining(scheduleRemainingSeconds) }}</strong>
      </div>

      <div class="topic-list">
      <router-link
        v-for="topic in topics"
        :key="topic.id"
        :to="{ path: `/quiz/${topic.id}`, query: { subject_id: String(subjectId), topic_label: topic.label } }"
        class="topic-card"
        :class="{ locked: !canStart }"
        :aria-disabled="!canStart"
        :tabindex="canStart ? 0 : -1"
        @click="handleTopicClick"
      >
        <span class="topic-label">{{ topic.label }} <span class="topic-count">({{ topic.question_count }})</span></span>
        <span class="topic-arrow">&rarr;</span>
      </router-link>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { fetchAssessmentSchedule, fetchTopics, fetchSubjects } from '@/api/client';
import type { AssessmentSchedule, Topic } from '@/types';

const route = useRoute();
const subjectId = Number(route.params.id);

const topics = ref<Topic[]>([]);
const subjectLabel = ref('');
const loading = ref(true);
const error = ref<string | null>(null);
const schedule = ref<AssessmentSchedule | null>(null);
const scheduleLoading = ref(true);
const scheduleRemainingSeconds = ref(0);
let scheduleTimer: ReturnType<typeof setInterval> | undefined;

const canStart = computed(() => schedule.value?.is_open === true && scheduleRemainingSeconds.value === 0);

async function loadTopicsData() {
  loading.value = true;
  scheduleLoading.value = true;
  error.value = null;

  try {
    const [fetchedTopics, subjects, fetchedSchedule] = await Promise.all([
      fetchTopics(subjectId),
      fetchSubjects(),
      fetchAssessmentSchedule(),
    ]);
    topics.value = fetchedTopics;
    const subject = subjects.find((s) => s.id === subjectId);
    subjectLabel.value = subject?.label ?? '';
    schedule.value = fetchedSchedule;
    scheduleRemainingSeconds.value = fetchedSchedule.starts_in_seconds;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat data.';
  } finally {
    loading.value = false;
    scheduleLoading.value = false;
  }
}

function handleTopicClick(event: MouseEvent) {
  if (!canStart.value) event.preventDefault();
}

function formatStartAt(value: string | null) {
  if (!value) return 'segera';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));
}

function formatRemaining(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}j ${minutes}m lagi`
    : minutes > 0
      ? `${minutes}m ${remainder}dtk lagi`
      : `${remainder}dtk lagi`;
}

onMounted(() => {
  loadTopicsData();
  scheduleTimer = setInterval(() => {
    if (scheduleRemainingSeconds.value > 0) {
      scheduleRemainingSeconds.value -= 1;
    }
    if (scheduleRemainingSeconds.value === 0 && schedule.value) {
      schedule.value.is_open = true;
    }
  }, 1000);
});

onUnmounted(() => {
  if (scheduleTimer) clearInterval(scheduleTimer);
});
</script>

<style scoped>
.topic-back {
  display: inline-block;
  color: #556677;
  text-decoration: none;
  margin-bottom: 20px;
  font-size: 0.95rem;
}

.topic-back:hover {
  color: #1e40af;
}

.topic-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 8px;
}

.topic-subtitle {
  color: #556677;
  margin-bottom: 32px;
}

.topic-state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.topic-loading,
.topic-error,
.topic-empty {
  color: #778899;
  font-style: italic;
}

.topic-error {
  color: #c53030;
}

.topic-action-btn {
  padding: 10px 18px;
  background: #1e40af;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.topic-action-btn:hover {
  background: #1c3a9c;
}

.topic-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.topic-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  text-decoration: none;
  color: #1a2b3c;
  font-size: 1.1rem;
  font-weight: 600;
  transition: box-shadow 0.15s, transform 0.15s;
}

.topic-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.topic-card.locked {
  color: #7085ad;
  cursor: not-allowed;
  opacity: 0.72;
}

.topic-card.locked:hover {
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow: 8px 12px 20px rgba(133, 159, 207, 0.14), inset 2px 2px 8px rgba(255, 255, 255, 0.62);
  transform: none;
}

.topic-card.locked .topic-arrow {
  background: #a7bada;
  box-shadow: none;
}

.topic-schedule-notice {
  position: relative;
  z-index: 1;
  width: min(100%, 700px);
  margin: 0 auto 18px;
  padding: 14px 18px;
  border: 1px solid rgba(255, 255, 255, 0.88);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.48);
  color: #59709d;
  font-size: 0.82rem;
  text-align: center;
  box-shadow: 5px 8px 16px rgba(118, 146, 197, 0.1);
}

.topic-schedule-notice strong {
  display: block;
  margin-top: 3px;
  color: #236bdc;
}

.topic-count {
  font-size: 0.85rem;
  color: #8899aa;
  font-weight: 400;
}

.topic-arrow {
  color: #1e40af;
  font-size: 1.3rem;
}
</style>

<style scoped>
.topic-view {
  position: relative;
  min-height: calc(100vh - 100px);
  padding: 42px 24px 72px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.94), transparent 36%),
    linear-gradient(145deg, #f3f7ff 0%, #e7efff 52%, #d6e4fc 100%);
  color: #10265e;
}

.topic-view::before,
.topic-view::after {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  box-shadow: inset 10px 10px 24px rgba(255, 255, 255, 0.3), 0 14px 32px rgba(105, 145, 212, 0.09);
  content: '';
  pointer-events: none;
}

.topic-view::before {
  width: 420px;
  height: 420px;
  top: -265px;
  left: -180px;
}

.topic-view::after {
  width: 390px;
  height: 390px;
  right: -190px;
  bottom: -225px;
}

.topic-back,
.topic-title,
.topic-subtitle,
.topic-list,
.topic-state,
.topic-loading {
  position: relative;
  z-index: 1;
  width: min(100%, 700px);
  margin-right: auto;
  margin-left: auto;
}

.topic-back {
  display: block;
  margin-bottom: 38px;
  color: #59709d;
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: none;
}

.topic-back:hover {
  color: #236bdc;
}

.topic-title {
  margin-bottom: 8px;
  color: #10265e;
  font-size: clamp(1.8rem, 4vw, 2.45rem);
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 1.15;
}

.topic-subtitle {
  margin-bottom: 30px;
  color: #59709d;
  font-size: 0.92rem;
}

.topic-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.topic-card {
  display: flex;
  min-height: 76px;
  align-items: center;
  justify-content: space-between;
  padding: 16px 22px 16px 24px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.62);
  color: #203969;
  font-size: 1rem;
  font-weight: 750;
  text-decoration: none;
  box-shadow: 8px 12px 20px rgba(133, 159, 207, 0.14), inset 2px 2px 8px rgba(255, 255, 255, 0.62);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.topic-card:hover {
  border-color: rgba(35, 139, 255, 0.46);
  box-shadow: 10px 16px 26px rgba(87, 127, 194, 0.2), inset 2px 2px 8px rgba(255, 255, 255, 0.7);
  transform: translateY(-2px);
}

.topic-count {
  margin-left: 4px;
  color: #7992c2;
  font-size: 0.8rem;
  font-weight: 600;
}

.topic-arrow {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #238bff, #1649dc);
  color: #fff;
  font-size: 1.25rem;
  line-height: 1;
  box-shadow: 0 8px 14px rgba(28, 91, 220, 0.22);
}

.topic-state,
.topic-loading {
  color: #59709d;
}

.topic-state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}

.topic-loading,
.topic-error,
.topic-empty {
  font-size: 0.9rem;
}

.topic-error {
  color: #dc3d55;
}

.topic-action-btn {
  padding: 13px 22px;
  border: 0;
  border-radius: 18px;
  background: linear-gradient(110deg, #238bff, #1649dc);
  color: #fff;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 700;
  box-shadow: 0 12px 20px rgba(28, 91, 220, 0.22);
  cursor: pointer;
}

.topic-action-btn:hover {
  background: linear-gradient(110deg, #3295ff, #1b53e4);
}

@media (max-width: 560px) {
  .topic-view {
    min-height: calc(100vh - 86px);
    padding: 28px 16px 48px;
  }

  .topic-back {
    margin-bottom: 30px;
  }

  .topic-title {
    font-size: 1.85rem;
  }

  .topic-subtitle {
    margin-bottom: 24px;
  }

  .topic-card {
    min-height: 68px;
    padding: 13px 14px 13px 18px;
    border-radius: 19px;
    font-size: 0.92rem;
  }

  .topic-arrow {
    width: 34px;
    height: 34px;
    font-size: 1.1rem;
  }
}
</style>
