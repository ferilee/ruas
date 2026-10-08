<template>
  <div class="home-view">
    <section class="selection-card" aria-labelledby="selection-title">
      <div class="selection-icon" aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <path d="M7 19 24 9l17 10-17 10L7 19Z" />
          <path d="M13 24v8c6 5 16 5 22 0v-8" />
          <path d="M41 20v10" />
          <path d="M38.5 34h5" />
        </svg>
      </div>

      <h1 id="selection-title">Simulasi Asesmen</h1>
      <p class="selection-subtitle">Pilih kelas, jenis asesmen, dan mata pelajaran untuk memulai asesmen</p>

      <div class="selection-form">
        <label class="select-field">
          <span class="field-label"><span class="field-icon">◆</span> Kelas:</span>
          <select v-model="selectedClassId" :disabled="curriculumLoading || curriculum.classes.length === 0" aria-label="Kelas">
            <option value="" disabled>Pilih kelas...</option>
            <option v-for="item in curriculum.classes" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </label>

        <label class="select-field">
          <span class="field-label"><span class="field-icon">▣</span> Jenis Asesmen:</span>
          <select v-model="selectedAssessmentTypeId" :disabled="curriculumLoading || curriculum.assessment_types.length === 0" aria-label="Jenis asesmen">
            <option value="" disabled>Pilih jenis asesmen...</option>
            <option v-for="item in curriculum.assessment_types" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </label>

        <label class="select-field">
          <span class="field-label"><span class="field-icon">▤</span> Mata Pelajaran:</span>
          <select v-model="selectedSubjectId" :disabled="curriculumLoading || filteredSubjects.length === 0" aria-label="Mata pelajaran">
            <option value="" disabled>
              {{ curriculumLoading ? 'Memuat mata pelajaran...' : 'Pilih mata pelajaran...' }}
            </option>
            <option v-for="subject in filteredSubjects" :key="subject.id" :value="subject.id">
              {{ subject.label }}
            </option>
          </select>
        </label>

        <p v-if="error" class="home-error" role="alert">{{ error }}</p>
        <p v-else-if="filteredSubjects.length === 0 && !curriculumLoading" class="home-empty">Belum ada mata pelajaran untuk pilihan ini.</p>
        <p v-if="scheduleError" class="home-error" role="alert">{{ scheduleError }}</p>
        <p v-else-if="schedule && !schedule.is_open" class="schedule-notice">
          Asesmen dibuka pada {{ formatStartAt(schedule.start_at) }}.
          <strong>{{ formatRemaining(scheduleRemainingSeconds) }}</strong>
        </p>

        <button class="start-button" :disabled="curriculumLoading || scheduleLoading || !selectedSubjectId || !canStart" @click="startAssessment">
          <span aria-hidden="true">▶</span>
          {{ curriculumLoading || scheduleLoading ? 'Memuat...' : canStart ? 'Mulai Asesmen' : 'Menunggu Jadwal' }}
        </button>

        <button v-if="error || scheduleError || (!curriculumLoading && filteredSubjects.length === 0)" class="reload-button" @click="loadData">
          Coba Lagi
        </button>
      </div>
    </section>

    <footer class="home-footer">Ruang Asesmen — Belajar dan berlatih dengan terarah.</footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { fetchAssessmentSchedule, fetchCurriculum } from '@/api/client';
import type { AssessmentSchedule, CurriculumData } from '@/types';

const router = useRouter();
const curriculum = ref<CurriculumData>({ classes: [], assessment_types: [], subjects: [] });
const selectedClassId = ref<number | ''>('');
const selectedAssessmentTypeId = ref<number | ''>('');
const selectedSubjectId = ref<number | ''>('');
const curriculumLoading = ref(true);
const error = ref<string | null>(null);
const schedule = ref<AssessmentSchedule | null>(null);
const scheduleLoading = ref(true);
const scheduleError = ref<string | null>(null);
const scheduleRemainingSeconds = ref(0);
let scheduleTimer: ReturnType<typeof setInterval> | undefined;

const canStart = computed(() => schedule.value?.is_open === true && scheduleRemainingSeconds.value === 0);
const filteredSubjects = computed(() => curriculum.value.subjects.filter((subject) => {
  const classMatches = subject.class_id == null || subject.class_id === Number(selectedClassId.value);
  const typeMatches = subject.assessment_type_id == null || subject.assessment_type_id === Number(selectedAssessmentTypeId.value);
  return classMatches && typeMatches;
}));

async function loadCurriculum() {
  curriculumLoading.value = true;
  error.value = null;

  try {
    curriculum.value = await fetchCurriculum();
    selectedClassId.value = curriculum.value.classes[0]?.id ?? '';
    selectedAssessmentTypeId.value = curriculum.value.assessment_types[0]?.id ?? '';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat data.';
  } finally {
    curriculumLoading.value = false;
  }
}

async function loadSchedule() {
  scheduleLoading.value = true;
  scheduleError.value = null;

  try {
    schedule.value = await fetchAssessmentSchedule();
    scheduleRemainingSeconds.value = schedule.value.starts_in_seconds;
  } catch (e) {
    schedule.value = null;
    scheduleError.value = e instanceof Error ? e.message : 'Gagal memuat jadwal asesmen.';
  } finally {
    scheduleLoading.value = false;
  }
}

async function loadData() {
  await Promise.all([loadCurriculum(), loadSchedule()]);
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

function startAssessment() {
  if (selectedSubjectId.value && canStart.value) {
    router.push(`/topics/${selectedSubjectId.value}`);
  }
}

function chooseFirstSubject() {
  selectedSubjectId.value = filteredSubjects.value.length === 1 ? filteredSubjects.value[0].id : '';
}

watch([selectedClassId, selectedAssessmentTypeId], chooseFirstSubject);

onMounted(() => {
  loadData();
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
.home-view {
  position: relative;
  display: flex;
  min-height: calc(100vh - 100px);
  flex-direction: column;
  align-items: center;
  padding: 46px 20px 30px;
  overflow: hidden;
  background-color: #3f7fb8;
  background-image: radial-gradient(rgba(255, 255, 255, 0.13) 1px, transparent 1px);
  background-size: 26px 26px;
}

.selection-card {
  position: relative;
  z-index: 1;
  width: min(100%, 394px);
  padding: 32px 38px 36px;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(21, 64, 100, 0.2);
  text-align: center;
}

.selection-icon {
  display: grid;
  width: 66px;
  height: 66px;
  margin: 0 auto 15px;
  place-items: center;
  border-radius: 50%;
  background: #397bb8;
  box-shadow: 0 8px 20px rgba(46, 110, 167, 0.24);
}

.selection-icon svg {
  width: 40px;
  height: 40px;
  fill: none;
  stroke: #fff;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.selection-card h1 {
  color: #202d3b;
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1.2;
}

.selection-subtitle {
  max-width: 260px;
  margin: 7px auto 26px;
  color: #8793a0;
  font-size: 0.8rem;
  line-height: 1.45;
}

.selection-form {
  display: flex;
  flex-direction: column;
  gap: 17px;
  text-align: left;
}

.select-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.field-label {
  color: #26384a;
  font-size: 0.78rem;
  font-weight: 700;
}

.field-icon {
  display: inline-block;
  width: 16px;
  color: #3679b5;
  font-size: 0.7rem;
  text-align: center;
}

.select-field select {
  width: 100%;
  min-height: 44px;
  padding: 0 13px;
  border: 1px solid #dbe3eb;
  border-radius: 10px;
  outline: none;
  background: #fff;
  color: #35495c;
  font: inherit;
  font-size: 0.82rem;
  box-shadow: 0 3px 9px rgba(37, 71, 101, 0.08);
  cursor: pointer;
}

.select-field select:focus {
  border-color: #397bb8;
  box-shadow: 0 0 0 3px rgba(57, 123, 184, 0.14);
}

.select-field select:disabled {
  color: #7f8b97;
  background: #f8fafc;
  cursor: default;
}

.home-error,
.home-empty {
  margin-top: -3px;
  color: #c53030;
  font-size: 0.76rem;
  text-align: center;
}

.home-empty {
  color: #778899;
}

.start-button {
  width: 100%;
  min-height: 46px;
  margin-top: 4px;
  border: 0;
  border-radius: 10px;
  background: #397bb8;
  color: #fff;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 700;
  box-shadow: 0 7px 14px rgba(46, 110, 167, 0.22);
  cursor: pointer;
  transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
}

.start-button:hover:not(:disabled) {
  background: #2f6da7;
  box-shadow: 0 9px 17px rgba(46, 110, 167, 0.28);
  transform: translateY(-1px);
}

.start-button:disabled {
  background: #a9bfd2;
  box-shadow: none;
  cursor: not-allowed;
}

.start-button span {
  margin-right: 7px;
  font-size: 0.75rem;
}

.reload-button {
  align-self: center;
  border: 0;
  background: transparent;
  color: #397bb8;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.home-footer {
  position: relative;
  z-index: 1;
  margin-top: 12px;
  padding: 8px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
  color: #6d7884;
  font-size: 0.68rem;
  box-shadow: 0 3px 8px rgba(21, 64, 100, 0.1);
}

@media (max-width: 520px) {
  .selection-card {
    padding: 28px 24px 30px;
  }

  .home-header {
    min-height: 86px;
  }

  .home-header .admin-link {
    right: 14px;
    font-size: 0.75rem;
  }

  .brand-mark {
    width: 44px;
    height: 44px;
  }

  .brand-copy strong {
    font-size: 1.08rem;
  }

  .home-view {
    min-height: calc(100vh - 86px);
    padding-top: 30px;
  }
}
</style>

<style scoped>
.home-view {
  min-height: calc(100vh - 100px);
  padding: 34px 20px 52px;
  background:
    radial-gradient(circle at 50% 34%, rgba(255, 255, 255, 0.94), transparent 34%),
    linear-gradient(145deg, #f3f7ff 0%, #e7efff 52%, #d6e4fc 100%);
}

.home-view::before,
.home-view::after {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.13);
  box-shadow: inset 10px 10px 24px rgba(255, 255, 255, 0.28), 0 12px 30px rgba(105, 145, 212, 0.08);
  content: '';
  pointer-events: none;
}

.home-view::before {
  width: 430px;
  height: 430px;
  top: -250px;
  left: -180px;
}

.home-view::after {
  width: 360px;
  height: 360px;
  right: -175px;
  bottom: -190px;
}

.selection-card {
  width: min(100%, 520px);
  padding: 18px 40px 24px;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.selection-icon {
  width: 126px;
  height: 126px;
  margin-bottom: 22px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 34px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.88), rgba(225, 236, 255, 0.72));
  box-shadow: 14px 16px 28px rgba(119, 148, 203, 0.2), inset 4px 4px 12px rgba(255, 255, 255, 0.85);
}

.selection-icon svg {
  width: 76px;
  height: 76px;
  stroke: #1760dc;
}

.selection-card h1 {
  color: #10265e;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.selection-subtitle {
  max-width: 310px;
  margin: 8px auto 30px;
  color: #59709d;
  font-size: 0.88rem;
  line-height: 1.6;
}

.selection-form {
  gap: 16px;
}

.select-field {
  gap: 7px;
}

.field-label {
  padding-left: 8px;
  color: #58709e;
  font-size: 0.76rem;
  font-weight: 700;
}

.field-icon {
  color: #236bdc;
}

.select-field select {
  min-height: 65px;
  padding: 0 18px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: 22px;
  background: rgba(245, 249, 255, 0.58);
  color: #203969;
  font-size: 0.84rem;
  box-shadow: 8px 10px 18px rgba(133, 159, 207, 0.16), inset 2px 2px 8px rgba(255, 255, 255, 0.55);
}

.select-field select:focus {
  border-color: rgba(35, 139, 255, 0.68);
  box-shadow: 0 0 0 3px rgba(35, 139, 255, 0.12), 8px 10px 18px rgba(133, 159, 207, 0.16);
}

.select-field select:disabled {
  color: #6b82ae;
  background: rgba(225, 236, 252, 0.62);
}

.home-error,
.home-empty {
  color: #dc3d55;
}

.home-empty {
  color: #59709d;
}

.schedule-notice {
  margin-top: -3px;
  color: #59709d;
  font-size: 0.76rem;
  line-height: 1.6;
  text-align: center;
}

.schedule-notice strong {
  display: block;
  color: #236bdc;
  font-size: 0.8rem;
}

.start-button {
  min-height: 65px;
  margin-top: 4px;
  border-radius: 25px;
  background: linear-gradient(110deg, #238bff, #1649dc);
  font-size: 0.95rem;
  box-shadow: 0 14px 24px rgba(28, 91, 220, 0.25);
}

.start-button:hover:not(:disabled) {
  background: linear-gradient(110deg, #3295ff, #1b53e4);
  box-shadow: 0 17px 28px rgba(28, 91, 220, 0.3);
}

.start-button:disabled {
  background: linear-gradient(110deg, #a7c1df, #91acd1);
  color: #fff;
}

.reload-button {
  color: #236bdc;
}

.home-footer {
  margin-top: 4px;
  padding: 8px 18px;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.48);
  color: #6076a2;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  box-shadow: 4px 6px 14px rgba(118, 146, 197, 0.12);
}

@media (max-width: 520px) {
  .home-view {
    min-height: calc(100vh - 86px);
    padding: 24px 16px 40px;
  }

  .selection-card {
    padding: 10px 14px 20px;
  }

  .selection-icon {
    width: 100px;
    height: 100px;
    margin-bottom: 18px;
    border-radius: 28px;
  }

  .selection-icon svg {
    width: 62px;
    height: 62px;
  }

  .selection-card h1 {
    font-size: 1.7rem;
  }

  .selection-subtitle {
    margin-bottom: 24px;
  }

  .select-field select,
  .start-button {
    min-height: 58px;
  }
}
</style>
