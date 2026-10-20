<template>
  <section v-if="!dismissed" class="onboarding-panel" aria-labelledby="onboarding-title">
    <div class="onboarding-heading">
      <div>
        <span class="onboarding-eyebrow">PANDUAN AWAL</span>
        <h2 id="onboarding-title">Siapkan asesmen pertamamu</h2>
        <p>Ikuti langkah berikut sampai asesmen siap dibagikan kepada siswa.</p>
      </div>
      <button class="onboarding-skip" type="button" @click="dismiss">Lewati panduan</button>
    </div>

    <div class="onboarding-progress" aria-label="Kemajuan panduan">
      <span><strong>{{ completedCount }}</strong> dari {{ steps.length }} langkah selesai</span>
      <div class="onboarding-progress-track"><span :style="{ width: `${progressPercent}%` }"></span></div>
    </div>

    <div class="onboarding-steps" role="tablist" aria-label="Langkah persiapan asesmen">
      <button
        v-for="(step, index) in steps"
        :key="step.id"
        class="onboarding-step"
        :class="{ active: index === activeStepIndex, complete: step.done }"
        type="button"
        role="tab"
        :aria-selected="index === activeStepIndex"
        @click="activeStepIndex = index"
      >
        <span class="onboarding-step-number">{{ step.done ? '✓' : index + 1 }}</span>
        <span class="onboarding-step-label"><span class="onboarding-step-icon" aria-hidden="true">{{ step.icon }}</span><span>{{ step.shortTitle }}</span></span>
      </button>
    </div>

    <div class="onboarding-current">
      <div>
        <span class="onboarding-current-label">Langkah {{ activeStepIndex + 1 }}</span>
        <h3>{{ currentStep.title }}</h3>
        <p>{{ currentStep.description }}</p>
        <span v-if="currentStep.done" class="onboarding-done-label">✓ Langkah ini sudah selesai</span>
      </div>
      <button class="onboarding-action" type="button" @click="continueStep">
        {{ currentStep.done ? (nextIncompleteIndex === -1 ? 'Selesai' : 'Lanjutkan') : currentStep.actionLabel }}
        <span aria-hidden="true">→</span>
      </button>
    </div>
  </section>

  <section v-else class="onboarding-collapsed">
    <div>
      <strong>Butuh panduan menyiapkan asesmen?</strong>
      <span>{{ completedCount }} dari {{ steps.length }} langkah selesai.</span>
    </div>
    <button type="button" @click="showWizard">Tampilkan panduan</button>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  username: string;
  classCount: number;
  subjectCount: number;
  assessmentTypeCount: number;
  topicCount: number;
  questionCount: number;
  securedTopicCount: number;
  scheduledTopicCount: number;
}>();

const emit = defineEmits<{ navigate: [section: 'curriculum' | 'questions' | 'schedule'] }>();
const dismissed = ref(false);
const activeStepIndex = ref(0);

const steps = computed(() => [
  {
    id: 'classes',
    shortTitle: 'Kelas',
    icon: '▦',
    title: 'Siapkan kelas',
    description: 'Buat kelas yang akan menerima asesmen, misalnya XI TKJ atau XI KKKR.',
    actionLabel: 'Buka pengaturan kelas',
    section: 'curriculum' as const,
    done: props.classCount > 0,
  },
  {
    id: 'subjects',
    shortTitle: 'Mapel',
    icon: '∑',
    title: 'Tambahkan mata pelajaran',
    description: 'Buat mata pelajaran dan atur durasi, attempts, serta kebijakan nilainya.',
    actionLabel: 'Buka pengaturan mata pelajaran',
    section: 'curriculum' as const,
    done: props.subjectCount > 0,
  },
  {
    id: 'assessment-types',
    shortTitle: 'Asesmen',
    icon: '◷',
    title: 'Tentukan jenis asesmen',
    description: 'Tambahkan jenis asesmen seperti latihan, ulangan harian, atau ujian semester.',
    actionLabel: 'Buka jenis asesmen',
    section: 'curriculum' as const,
    done: props.assessmentTypeCount > 0,
  },
  {
    id: 'topics',
    shortTitle: 'Topik',
    icon: '◈',
    title: 'Buat topik dan mapping kelas',
    description: 'Buat topik, lalu tentukan kelas yang boleh mengaksesnya.',
    actionLabel: 'Buka pengaturan topik',
    section: 'curriculum' as const,
    done: props.topicCount > 0,
  },
  {
    id: 'questions',
    shortTitle: 'Soal',
    icon: '?',
    title: 'Tambahkan bank soal',
    description: 'Masukkan soal secara manual atau import JSON ke dalam topik yang sudah dibuat.',
    actionLabel: 'Buka bank soal',
    section: 'questions' as const,
    done: props.questionCount > 0,
  },
  {
    id: 'publish',
    shortTitle: 'Bagikan',
    icon: '↗',
    title: 'Atur akses dan jadwal',
    description: 'Pastikan token topik aktif dan atur jadwal sebelum membagikan asesmen kepada siswa.',
    actionLabel: 'Buka akses dan jadwal',
    section: 'schedule' as const,
    done: props.securedTopicCount > 0 && props.scheduledTopicCount > 0,
  },
]);

const completedCount = computed(() => steps.value.filter((step) => step.done).length);
const progressPercent = computed(() => Math.round((completedCount.value / steps.value.length) * 100));
const currentStep = computed(() => steps.value[activeStepIndex.value] ?? steps.value[0]);
const nextIncompleteIndex = computed(() => steps.value.findIndex((step) => !step.done));
const storageKey = computed(() => `ruas_teacher_onboarding_dismissed:${props.username}`);

function continueStep() {
  if (!currentStep.value.done) {
    emit('navigate', currentStep.value.section);
    return;
  }
  if (nextIncompleteIndex.value >= 0) {
    activeStepIndex.value = nextIncompleteIndex.value;
    return;
  }
  dismiss();
}

function dismiss() {
  dismissed.value = true;
  localStorage.setItem(storageKey.value, '1');
}

function showWizard() {
  dismissed.value = false;
  localStorage.removeItem(storageKey.value);
  const firstIncomplete = nextIncompleteIndex.value;
  activeStepIndex.value = firstIncomplete >= 0 ? firstIncomplete : 0;
}

watch(steps, (nextSteps) => {
  if (!nextSteps[activeStepIndex.value]?.done) return;
  const firstIncomplete = nextSteps.findIndex((step) => !step.done);
  if (firstIncomplete >= 0) activeStepIndex.value = firstIncomplete;
}, { deep: true });

onMounted(() => {
  dismissed.value = localStorage.getItem(storageKey.value) === '1';
  const firstIncomplete = nextIncompleteIndex.value;
  activeStepIndex.value = firstIncomplete >= 0 ? firstIncomplete : 0;
});
</script>

<style scoped>
.onboarding-panel, .onboarding-collapsed { border: 1px solid #d9e7f3; border-radius: 18px; background: linear-gradient(135deg, #fff 0%, #f5fbff 100%); box-shadow: 0 10px 24px rgba(31, 74, 126, .07); }
.onboarding-panel { display: flex; flex-direction: column; gap: 18px; padding: 22px; }
.onboarding-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.onboarding-eyebrow { color: #147d8b; font-size: .67rem; font-weight: 800; letter-spacing: .14em; }
.onboarding-heading h2 { margin: 5px 0 5px; color: #17427d; font-size: 1.25rem; }
.onboarding-heading p { color: #7088a4; font-size: .82rem; }
.onboarding-skip { border: 0; color: #6d839e; background: transparent; font: inherit; font-size: .75rem; cursor: pointer; }
.onboarding-skip:hover { color: #147d8b; text-decoration: underline; }
.onboarding-progress { display: flex; align-items: center; gap: 12px; color: #66819f; font-size: .74rem; }
.onboarding-progress strong { color: #147d8b; }
.onboarding-progress-track { height: 7px; flex: 1; overflow: hidden; border-radius: 99px; background: #dcebf1; }
.onboarding-progress-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #18a39b, #2b76c9); transition: width .25s ease; }
.onboarding-steps { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 7px; }
.onboarding-step { display: flex; min-width: 0; flex-direction: column; align-items: center; gap: 6px; padding: 9px 5px; border: 1px solid #d9e7f3; border-radius: 11px; color: #7087a0; background: rgba(255,255,255,.78); font: inherit; font-size: .68rem; cursor: pointer; }
.onboarding-step-label { display: inline-flex; min-width: 0; align-items: center; gap: 4px; }
.onboarding-step-icon { color: currentColor; font-size: .78rem; font-weight: 800; line-height: 1; }
.onboarding-step:hover, .onboarding-step.active { border-color: #67bdba; color: #147d8b; background: #effafa; }
.onboarding-step.complete { color: #237c67; border-color: #b6e2d2; background: #effbf6; }
.onboarding-step-number { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 50%; color: #597692; background: #edf4fa; font-size: .72rem; font-weight: 800; }
.onboarding-step.active .onboarding-step-number { color: #fff; background: #168f91; }
.onboarding-step.complete .onboarding-step-number { color: #fff; background: #35a27c; }
.onboarding-current { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 17px; border-radius: 13px; background: rgba(226, 246, 246, .72); }
.onboarding-current-label { color: #168f91; font-size: .67rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.onboarding-current h3 { margin: 4px 0; color: #17427d; font-size: 1rem; }
.onboarding-current p { color: #67809c; font-size: .78rem; line-height: 1.45; }
.onboarding-done-label { display: inline-block; margin-top: 7px; color: #237c67; font-size: .72rem; font-weight: 700; }
.onboarding-action, .onboarding-collapsed button { display: inline-flex; flex-shrink: 0; align-items: center; gap: 9px; padding: 11px 15px; border: 0; border-radius: 10px; color: #fff; background: linear-gradient(100deg, #138d90, #2772c6); font: inherit; font-size: .77rem; font-weight: 750; cursor: pointer; box-shadow: 0 7px 16px rgba(24, 133, 150, .2); }
.onboarding-action:hover, .onboarding-collapsed button:hover { transform: translateY(-1px); }
.onboarding-collapsed { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 15px 18px; }
.onboarding-collapsed div { display: flex; flex-direction: column; gap: 4px; }
.onboarding-collapsed strong { color: #17427d; font-size: .85rem; }
.onboarding-collapsed span { color: #7188a1; font-size: .74rem; }
.onboarding-collapsed button { padding: 8px 12px; font-size: .72rem; }
@media (max-width: 760px) {
  .onboarding-heading, .onboarding-current, .onboarding-collapsed { align-items: stretch; flex-direction: column; }
  .onboarding-skip { align-self: flex-start; padding: 0; }
  .onboarding-steps { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .onboarding-action, .onboarding-collapsed button { justify-content: center; }
}
</style>
