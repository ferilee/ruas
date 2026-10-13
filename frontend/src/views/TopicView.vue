<template>
  <div class="topic-view">
    <div v-if="tokenModalTopic" class="topic-token-backdrop" role="presentation" @click.self="closeTokenModal">
      <form class="topic-token-modal" @submit.prevent="submitTopicToken">
        <button class="topic-token-close" type="button" aria-label="Tutup" @click="closeTokenModal">×</button>
        <span class="topic-token-icon" aria-hidden="true">🔐</span>
        <span class="topic-token-kicker">AKSES TOPIK</span>
        <h2>Masukkan token</h2>
        <p>Token diperlukan untuk membuka topik <strong>{{ tokenModalTopic.label }}</strong>.</p>
        <label>Token topik<input v-model.trim="tokenInput" type="text" autocomplete="one-time-code" placeholder="Masukkan token" autofocus /></label>
        <p v-if="tokenError" class="topic-error">{{ tokenError }}</p>
        <button class="topic-action-btn topic-token-submit" type="submit" :disabled="tokenLoading || !tokenInput">{{ tokenLoading ? 'Memeriksa...' : 'Buka Topik' }}</button>
      </form>
    </div>
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
      <div class="topic-list">
        <button
          v-for="topic in topics"
          :key="topic.id"
          class="topic-card"
          type="button"
          :class="{ locked: !canEnterTopic(topic), 'token-locked': topic.requires_token && !hasTopicAccess(topic.id) }"
          :aria-disabled="!canEnterTopic(topic)"
          :tabindex="canEnterTopic(topic) ? 0 : -1"
          @click="handleTopicClick(topic)"
        >
        <span class="topic-label"><span>{{ topic.label }} <span class="topic-count">({{ topic.question_count }})</span></span><small class="topic-attempts"><span v-if="topic.requires_token && !hasTopicAccess(topic.id)" class="topic-lock-label">🔒 Token diperlukan · </span>{{ scheduleLabel(topic.id) }} · {{ attemptsLabel(topic.id) }}</small></span>
        <span class="topic-arrow">{{ topic.requires_token && !hasTopicAccess(topic.id) ? '🔐' : '→' }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchAssessmentSchedule, fetchExamAttemptAvailability, fetchTopics, fetchSubjects, getTopicAccessToken, verifyTopicAccess } from '@/api/client';
import type { AssessmentSchedule, ExamAttemptAvailability, Topic } from '@/types';

const route = useRoute();
const router = useRouter();
const subjectId = Number(route.params.id);

const topics = ref<Topic[]>([]);
const subjectLabel = ref('');
const loading = ref(true);
const error = ref<string | null>(null);
const schedule = ref<AssessmentSchedule | null>(null);
const scheduleLoading = ref(true);
const scheduleRemainingSeconds = ref(0);
const topicSchedules = ref<Record<number, AssessmentSchedule>>({});
const topicAvailability = ref<Record<number, ExamAttemptAvailability | null>>({});
const topicAccessState = ref<Record<number, boolean>>({});
const tokenModalTopic = ref<Topic | null>(null);
const tokenInput = ref('');
const tokenError = ref('');
const tokenLoading = ref(false);
let scheduleTimer: ReturnType<typeof setInterval> | undefined;

const canStart = computed(() => Object.values(topicSchedules.value).some((item) => item.is_open));

async function loadTopicsData() {
  loading.value = true;
  scheduleLoading.value = true;
  error.value = null;

  try {
    const [fetchedTopics, subjects] = await Promise.all([
      fetchTopics(subjectId),
      fetchSubjects(),
    ]);
    topics.value = fetchedTopics;
    topicAccessState.value = Object.fromEntries(fetchedTopics.map((topic) => [topic.id, Boolean(getTopicAccessToken(topic.id))]));
    const availability = await Promise.all(fetchedTopics.map(async (topic) => {
      try {
        return [topic.id, await fetchExamAttemptAvailability(subjectId, topic.id)] as const;
      } catch {
        return [topic.id, null] as const;
      }
    }));
    topicAvailability.value = Object.fromEntries(availability);
    const subject = subjects.find((s) => s.id === subjectId);
    subjectLabel.value = subject?.label ?? '';
    const schedules = await Promise.all(fetchedTopics.map(async (topic) => [topic.id, await fetchAssessmentSchedule(topic.id)] as const));
    topicSchedules.value = Object.fromEntries(schedules);
    schedule.value = schedules[0]?.[1] ?? null;
    scheduleRemainingSeconds.value = schedule.value?.starts_in_seconds ?? 0;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat data.';
  } finally {
    loading.value = false;
    scheduleLoading.value = false;
  }
}

function hasTopicAccess(topicId: number) {
  return topicAccessState.value[topicId] || Boolean(getTopicAccessToken(topicId));
}

function topicSchedule(topicId: number) {
  return topicSchedules.value[topicId];
}

function canStartTopic(topic: Topic) {
  return topicSchedule(topic.id)?.is_open === true;
}

function canEnterTopic(topic: Topic) {
  return (canStartTopic(topic) || topicAvailability.value[topic.id]?.has_active_attempt === true) && canOpenTopic(topic);
}

function scheduleLabel(topicId: number) {
  const item = topicSchedule(topicId);
  if (!item || item.state === 'open') return 'Sedang berlangsung';
  if (item.state === 'upcoming') return `Akan datang · ${formatStartAt(item.start_at)}`;
  if (item.state === 'disabled') return 'Dinonaktifkan';
  return 'Sudah berakhir';
}

function canOpenTopic(topic: Topic) {
  const availability = topicAvailability.value[topic.id];
  if (availability?.has_active_attempt) return true;
  if (topic.requires_token && !hasTopicAccess(topic.id)) return false;
  return !availability || availability.can_start;
}

function openTokenModal(topic: Topic) {
  tokenModalTopic.value = topic;
  tokenInput.value = '';
  tokenError.value = '';
}

function closeTokenModal() {
  tokenModalTopic.value = null;
  tokenInput.value = '';
  tokenError.value = '';
}

async function submitTopicToken() {
  const topic = tokenModalTopic.value;
  if (!topic || !tokenInput.value) return;
  tokenLoading.value = true;
  tokenError.value = '';
  try {
    await verifyTopicAccess(topic.id, tokenInput.value);
    topicAccessState.value = { ...topicAccessState.value, [topic.id]: true };
    closeTokenModal();
    await router.push({ path: `/quiz/${topic.id}`, query: { subject_id: String(subjectId), topic_label: topic.label } });
  } catch (error) {
    tokenError.value = error instanceof Error ? error.message : 'Token topik tidak dapat diverifikasi.';
  } finally {
    tokenLoading.value = false;
  }
}

async function handleTopicClick(topic: Topic) {
  const availability = topicAvailability.value[topic.id];
  if (!canEnterTopic(topic) || (!availability?.has_active_attempt && availability && !availability.can_start)) {
    return;
  }
  if (topic.requires_token && !hasTopicAccess(topic.id) && !availability?.has_active_attempt) {
    openTokenModal(topic);
    return;
  }
  await router.push({ path: `/quiz/${topic.id}`, query: { subject_id: String(subjectId), topic_label: topic.label } });
}

function attemptsLabel(topicId: number) {
  const availability = topicAvailability.value[topicId];
  if (!availability) return 'Batas percobaan diverifikasi saat mulai';
  if (availability.has_active_attempt) return 'Lanjutkan percobaan aktif';
  if (availability.max_attempts === 0) return 'Percobaan tak terbatas';
  if (availability.remaining_attempts === 0) return 'Percobaan habis';
  return `${availability.remaining_attempts} percobaan tersisa`;
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
    for (const item of Object.values(topicSchedules.value)) {
      if (item.start_at && new Date(item.start_at).getTime() <= Date.now() && (!item.end_at || new Date(item.end_at).getTime() > Date.now()) && item.enabled) {
        item.is_open = true;
        item.state = 'open';
      }
      if (item.end_at && new Date(item.end_at).getTime() <= Date.now()) {
        item.is_open = false;
        item.state = 'ended';
      }
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
  min-height: calc(100svh - 100px);
  min-height: calc(100dvh - 100px);
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
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.9);
  font: inherit;
  text-align: left;
  cursor: pointer;
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

.topic-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.topic-attempts {
  color: #6282b5;
  font-size: 0.72rem;
  font-weight: 600;
}

.topic-card.locked .topic-attempts {
  color: #a26969;
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

.topic-card.token-locked .topic-arrow {
  background: linear-gradient(145deg, #9db4d8, #758eb8);
  box-shadow: none;
  font-size: 1rem;
}

.topic-lock-label { color: #9a6a73; }
.topic-token-backdrop { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(16, 38, 94, .34); backdrop-filter: blur(7px); }
.topic-token-modal { position: relative; width: min(420px, 100%); padding: 28px; border: 1px solid rgba(255, 255, 255, .9); border-radius: 24px; background: linear-gradient(145deg, #fff, #f1f6ff); box-shadow: 0 24px 60px rgba(42, 76, 139, .28); }
.topic-token-close { position: absolute; top: 14px; right: 15px; width: 30px; height: 30px; border: 0; border-radius: 50%; color: #6680aa; background: #eaf1fc; font-size: 1.25rem; line-height: 1; cursor: pointer; }
.topic-token-icon { display: grid; width: 48px; height: 48px; margin-bottom: 14px; place-items: center; border-radius: 15px; background: #e8f1ff; font-size: 1.4rem; }
.topic-token-kicker { color: #4781c7; font-size: .66rem; font-weight: 800; letter-spacing: .15em; }
.topic-token-modal h2 { margin-top: 6px; color: #10265e; font-size: 1.35rem; }.topic-token-modal p { margin-top: 7px; color: #6680aa; font-size: .82rem; line-height: 1.5; }.topic-token-modal label { display: flex; margin-top: 20px; flex-direction: column; gap: 7px; color: #49678f; font-size: .75rem; font-weight: 700; }.topic-token-modal input { width: 100%; padding: 12px 13px; border: 1px solid #d2e0f3; border-radius: 11px; color: #244978; background: #fff; font: inherit; font-size: .86rem; outline: none; }.topic-token-modal input:focus { border-color: #438ae5; box-shadow: 0 0 0 4px rgba(67, 138, 229, .14); }.topic-token-modal .topic-error { margin-top: 9px; color: #c94e63; font-size: .76rem; }.topic-token-submit { width: 100%; margin-top: 18px; }

@media (max-width: 560px) {
  .topic-view {
    min-height: calc(100vh - 86px);
    min-height: calc(100svh - 86px);
    min-height: calc(100dvh - 86px);
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

  .topic-token-modal { padding: 24px 20px; border-radius: 20px; }
}
</style>
