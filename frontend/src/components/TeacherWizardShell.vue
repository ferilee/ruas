<template>
  <div class="teacher-wizard-shell">
    <aside class="wizard-sidebar" aria-label="Langkah ruang kerja guru">
      <div class="wizard-profile">
        <span class="wizard-avatar" aria-hidden="true">{{ avatarInitial }}</span>
        <div>
          <strong>{{ props.displayName || 'Guru' }}</strong>
          <span>{{ roleLabel }} · Ruang Asesmen</span>
        </div>
      </div>

      <nav class="wizard-steps" aria-label="Langkah menyiapkan asesmen">
        <button
          v-for="(step, index) in props.steps"
          :key="step.id"
          type="button"
          :class="['wizard-step', { 'is-active': step.id === props.activeStep, 'is-complete': step.complete === true }]"
          :aria-current="step.id === props.activeStep ? 'step' : undefined"
          @click="emit('select-step', step.id)"
        >
          <span class="wizard-step-number">{{ step.complete ? '✓' : index + 1 }}</span>
          <span class="wizard-step-copy">
            <strong>
              <span class="wizard-step-title-desktop">{{ step.title }}</span>
              <span class="wizard-step-title-mobile">{{ step.mobileTitle }}</span>
            </strong>
            <small>{{ step.description }}</small>
          </span>
        </button>
      </nav>

      <p class="wizard-side-note">Mulai dari kelas, lanjutkan ke topik dan soal, atur jadwal, lalu pantau hasil belajar siswa.</p>

      <div class="wizard-sidebar-footer">
        <button type="button" @click="emit('feedback')">Saran &amp; Testimoni</button>
        <router-link to="/dukung">Dukung RUAS</router-link>
        <a href="https://simak.smkpasirian-lmj.sch.id/login" target="_blank" rel="noopener noreferrer">Buka SIMAK ↗</a>
      </div>
    </aside>

    <section class="wizard-main" aria-label="Isi langkah ruang kerja guru">
      <div class="wizard-main-topbar">
        <span v-if="identityLabel" class="wizard-identity" :title="`Masuk sebagai ${props.displayName}`">{{ identityLabel }}</span>
        <span class="wizard-badge">RUAS · GURU</span>
        <span class="wizard-topbar-spacer"></span>
        <button class="wizard-topbar-btn" type="button" @click="emit('back')">Kembali ke beranda</button>
        <button class="wizard-topbar-btn" type="button" @click="emit('logout')">Keluar (logout)</button>
      </div>

      <div class="wizard-main-heading">
        <p class="wizard-eyebrow">Langkah {{ activeIndex + 1 }} dari {{ props.steps.length }}</p>
        <h2>{{ activeStepDef?.title }}</h2>
        <p>{{ activeStepDef?.description }}</p>
      </div>

      <slot />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TeacherStepId } from '@/lib/teacher-wizard';

export interface TeacherWizardStepDef {
  id: TeacherStepId;
  title: string;
  mobileTitle: string;
  description: string;
  /** true = tanda ✓; false = belum; null = langkah tanpa tanda selesai (Laporan). */
  complete: boolean | null;
}

const props = defineProps<{
  steps: TeacherWizardStepDef[];
  activeStep: TeacherStepId;
  displayName?: string;
  sessionRole?: 'admin' | 'editor';
}>();

const emit = defineEmits<{
  'select-step': [step: TeacherStepId];
  back: [];
  logout: [];
  feedback: [];
}>();

const roleLabel = computed(() => (props.sessionRole === 'admin' ? 'Admin' : 'Guru'));
const identityLabel = computed(() => (props.displayName ? `${props.displayName} · ${roleLabel.value}` : ''));
const avatarInitial = computed(() => (props.displayName?.trim().charAt(0) || 'G').toUpperCase());
const activeIndex = computed(() => Math.max(0, props.steps.findIndex((step) => step.id === props.activeStep)));
const activeStepDef = computed(() => props.steps[activeIndex.value]);
</script>

<style scoped>
/* Kelas digandakan agar grid shell selalu menang atas aturan .admin-layout
   AdminView yang ikut terbawa lewat class fallthrough pada <component :is>. */
.teacher-wizard-shell.teacher-wizard-shell {
  display: grid;
  grid-template-columns: 268px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px clamp(14px, 3vw, 32px) 48px;
}

.wizard-sidebar {
  position: sticky;
  top: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px 16px;
  border: 1px solid #dce7f4;
  border-radius: 16px;
  color: #1d3557;
  background: linear-gradient(180deg, #fff 0%, #f7faff 100%);
  box-shadow: 0 14px 34px rgba(31, 74, 126, .08);
}

.wizard-profile { display: flex; align-items: center; gap: 12px; min-width: 0; }
.wizard-avatar { display: grid; width: 42px; height: 42px; flex: 0 0 auto; place-items: center; border-radius: 50%; color: #fff; background: linear-gradient(145deg, #7350c7, #2772c6); font-size: 1.05rem; font-weight: 800; }
.wizard-profile > div { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.wizard-profile strong { overflow: hidden; color: #172b4d; font-size: .92rem; text-overflow: ellipsis; white-space: nowrap; }
.wizard-profile span { color: #66788e; font-size: .7rem; }

.wizard-steps { display: flex; flex-direction: column; gap: 6px; }
.wizard-step {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  width: 100%;
  padding: 11px 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  color: #435d7d;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color .18s ease, background .18s ease;
}
.wizard-step:hover { border-color: #cbd9e8; background: #f2f7fd; }
.wizard-step:focus-visible, .wizard-topbar-btn:focus-visible, .wizard-sidebar-footer button:focus-visible, .wizard-sidebar-footer a:focus-visible { outline: 2px solid #7350c7; outline-offset: 2px; }
.wizard-step.is-active { border-color: #a68ae0; background: #efeaff; color: #2e1a5e; }
.wizard-step-number { display: grid; width: 26px; height: 26px; flex: 0 0 auto; place-items: center; border-radius: 50%; color: #5b7290; background: #e3ecf6; font-size: .74rem; font-weight: 800; }
.wizard-step.is-active .wizard-step-number { color: #fff; background: #7350c7; }
.wizard-step.is-complete .wizard-step-number { color: #fff; background: #1e9e6a; }
.wizard-step-copy { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.wizard-step-copy strong { color: #234978; font-size: .84rem; }
.wizard-step.is-active .wizard-step-copy strong { color: #2e1a5e; }
.wizard-step-copy small { color: #66788e; font-size: .68rem; line-height: 1.45; }
.wizard-step-title-mobile { display: none; }

.wizard-side-note { color: #66788e; font-size: .72rem; line-height: 1.55; }
.wizard-sidebar-footer { display: flex; flex-direction: column; gap: 6px; margin-top: auto; padding-top: 14px; border-top: 1px solid #e2eaf3; }
.wizard-sidebar-footer button, .wizard-sidebar-footer a { padding: 8px 10px; border: 0; border-radius: 8px; color: #365678; background: transparent; font: inherit; font-size: .74rem; font-weight: 650; text-align: left; text-decoration: none; cursor: pointer; }
.wizard-sidebar-footer button:hover, .wizard-sidebar-footer a:hover { color: #1d5fc0; background: #edf5ff; }

.wizard-main { min-width: 0; }
.wizard-main-topbar { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; margin-bottom: 20px; }
.wizard-identity { padding: 7px 11px; border: 1px solid #dce7f4; border-radius: 999px; color: #365678; background: #f2f7fd; font-size: .72rem; font-weight: 700; white-space: nowrap; }
.wizard-badge { padding: 8px 11px; border: 1px solid #cbd9e8; border-radius: 999px; color: #315f9c; background: #eef4fc; font-size: .65rem; font-weight: 800; letter-spacing: .08em; white-space: nowrap; }
.wizard-topbar-spacer { flex: 1; }
.wizard-topbar-btn { padding: 8px 11px; border: 1px solid #cbd9e8; border-radius: 8px; color: #365678; background: #fff; font: inherit; font-size: .68rem; font-weight: 700; white-space: nowrap; cursor: pointer; }
.wizard-topbar-btn:hover { border-color: #8bb5e4; color: #1d5fc0; background: #edf5ff; }

.wizard-main-heading { margin-bottom: 22px; }
.wizard-eyebrow { color: #7350c7; font-size: .67rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
.wizard-main-heading h2 { margin-top: 8px; color: #172b4d; font-size: clamp(1.6rem, 3vw, 2.3rem); font-weight: 800; letter-spacing: -.03em; }
.wizard-main-heading p:last-child { margin-top: 6px; color: #526a86; font-size: .88rem; }

@media (max-width: 900px) {
  .teacher-wizard-shell.teacher-wizard-shell { grid-template-columns: 1fr; gap: 16px; padding-top: 16px; }
  .wizard-sidebar { position: static; gap: 12px; padding: 14px; }
  .wizard-steps { flex-direction: row; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
  .wizard-step { flex: 0 0 auto; align-items: center; width: auto; padding: 8px 11px; }
  .wizard-step-copy small { display: none; }
  .wizard-step-title-desktop { display: none; }
  .wizard-step-title-mobile { display: inline; }
  .wizard-side-note { display: none; }
  .wizard-sidebar-footer { flex-direction: row; flex-wrap: wrap; margin-top: 0; padding-top: 10px; }
}
</style>
