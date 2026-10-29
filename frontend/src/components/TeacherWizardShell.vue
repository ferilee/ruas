<template>
  <div class="teacher-wizard-shell">
    <div class="wizard-topbar">
      <span v-if="identityLabel" class="wizard-identity" :title="`Masuk sebagai ${props.displayName}`">{{ identityLabel }}</span>
      <span class="wizard-badge">RUAS · GURU</span>
      <span class="wizard-topbar-spacer"></span>
      <button class="wizard-topbar-btn" type="button" @click="emit('back')">Kembali ke beranda</button>
      <button class="wizard-topbar-btn" type="button" @click="emit('logout')">Keluar (logout)</button>
    </div>

    <header class="wizard-page-header">
      <p class="wizard-page-eyebrow">Ruang Kerja Guru</p>
      <h1 class="wizard-page-title">Ruang kerja guru</h1>
      <p class="wizard-page-subtitle">Siapkan asesmen dari kelas hingga laporan dalam langkah yang jelas.</p>
    </header>

    <div class="wizard-layout">
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
        <div class="wizard-main-heading">
          <div class="wizard-main-heading-copy">
            <p class="wizard-eyebrow">Langkah {{ activeIndex + 1 }} dari {{ props.steps.length }}</p>
            <h2>{{ activeStepDef?.title }}</h2>
            <p>{{ activeStepDef?.description }}</p>
          </div>
          <span class="wizard-role-chip">{{ roleLabel }}</span>
        </div>

        <div class="wizard-main-content">
          <slot />
        </div>
      </section>
    </div>
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
/* Palet mengikuti wizard guru SIMAK: brand #175cd3 / brand-dark #1849a9 /
   brand-soft #eff8ff / ring #b2ddff / ink #101828 / muted #667085 /
   border #d0d5dd / border-soft #eaecf0 di atas latar halaman #f4f7fb.
   Kelas akar digandakan agar selalu menang atas aturan .admin-layout
   AdminView yang ikut terbawa lewat class fallthrough pada <component :is>. */
.teacher-wizard-shell.teacher-wizard-shell {
  display: block;
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px clamp(14px, 3vw, 32px) 48px;
  color: #101828;
}

/* ── Bilah atas: identitas + aksi akun (pola baris brand SIMAK) ── */
.wizard-topbar { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; }
.wizard-identity { padding: 7px 12px; border: 1px solid #d0d5dd; border-radius: 999px; color: #101828; background: #fff; font-size: .72rem; font-weight: 700; white-space: nowrap; }
.wizard-badge { padding: 6px 10px; border-radius: 999px; color: #1849a9; background: #eff8ff; font-size: .65rem; font-weight: 800; letter-spacing: .08em; white-space: nowrap; }
.wizard-topbar-spacer { flex: 1; }
.wizard-topbar-btn { padding: 8px 14px; border: 1px solid #d0d5dd; border-radius: 999px; color: #101828; background: #fff; font: inherit; font-size: .72rem; font-weight: 700; white-space: nowrap; cursor: pointer; }
.wizard-topbar-btn:hover { border-color: #b2ddff; color: #1849a9; background: #eff8ff; }
.wizard-topbar-btn:focus-visible, .wizard-step:focus-visible, .wizard-sidebar-footer button:focus-visible, .wizard-sidebar-footer a:focus-visible { outline: 2px solid #175cd3; outline-offset: 2px; }

/* ── Kepala halaman ala SIMAK ── */
.wizard-page-header { padding: 28px 0 24px; }
.wizard-page-eyebrow { color: #175cd3; font-size: .75rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.wizard-page-title { margin-top: 8px; color: #101828; font-size: clamp(2rem, 4vw, 2.9rem); font-weight: 800; letter-spacing: -.04em; line-height: 1.05; }
.wizard-page-subtitle { margin-top: 10px; max-width: 620px; color: #667085; font-size: 1rem; line-height: 1.5; }

/* ── Kerangka dua kartu ── */
.wizard-layout { display: grid; grid-template-columns: minmax(220px, 270px) minmax(0, 1fr); gap: 24px; align-items: start; }

.wizard-sidebar {
  position: sticky;
  top: 24px;
  min-width: 0;
  padding: 20px;
  border: 1px solid #eaecf0;
  border-radius: 20px;
  color: #101828;
  background: linear-gradient(180deg, #eff8ff 0%, #fff 55%);
  box-shadow: 0 8px 24px rgba(16, 24, 40, .06);
}

.wizard-profile { display: flex; align-items: center; gap: 12px; padding-bottom: 18px; border-bottom: 1px solid rgba(152, 162, 179, .28); }
.wizard-avatar { display: grid; width: 40px; height: 40px; flex: 0 0 auto; place-items: center; border-radius: 50%; color: #fff; background: #175cd3; font-weight: 800; }
.wizard-profile > div { display: grid; min-width: 0; gap: 2px; }
.wizard-profile strong { overflow: hidden; color: #101828; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
.wizard-profile > div span { color: #667085; font-size: 12px; }

.wizard-steps { position: relative; display: grid; gap: 8px; min-width: 0; margin-top: 20px; }
.wizard-steps::before { content: ""; position: absolute; top: 22px; bottom: 22px; left: 19px; width: 2px; background: #d0d5dd; }
.wizard-step {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 12px;
  color: #101828;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.wizard-step:hover { background: rgba(255, 255, 255, .75); }
.wizard-step-number { display: grid; width: 40px; height: 40px; place-items: center; border: 2px solid #d0d5dd; border-radius: 50%; color: #98a2b3; background: #fff; font-weight: 800; }
.wizard-step.is-active { border-color: #b2ddff; background: #fff; box-shadow: 0 5px 16px rgba(16, 24, 40, .08); }
.wizard-step.is-active .wizard-step-number, .wizard-step.is-complete .wizard-step-number { border-color: #175cd3; color: #fff; background: #175cd3; }
.wizard-step-copy { display: grid; min-width: 0; gap: 2px; }
.wizard-step-copy strong { color: #101828; font-size: 14px; }
.wizard-step.is-active .wizard-step-copy strong, .wizard-step.is-complete .wizard-step-copy strong { color: #1849a9; }
.wizard-step-copy small { color: #667085; font-size: 12px; line-height: 1.35; overflow-wrap: anywhere; }
.wizard-step-title-mobile { display: none; }

.wizard-side-note { margin: 22px 4px 0; color: #667085; font-size: 12px; line-height: 1.55; }
.wizard-sidebar-footer { display: flex; flex-direction: column; gap: 6px; margin-top: 18px; padding-top: 14px; border-top: 1px solid #eaecf0; }
.wizard-sidebar-footer button, .wizard-sidebar-footer a { padding: 8px 10px; border: 0; border-radius: 8px; color: #1849a9; background: transparent; font: inherit; font-size: .78rem; font-weight: 650; text-align: left; text-decoration: none; cursor: pointer; }
.wizard-sidebar-footer button:hover, .wizard-sidebar-footer a:hover { color: #1849a9; background: #eff8ff; }

/* ── Kartu isi ala .wizard-main SIMAK ── */
.wizard-main { min-width: 0; padding: clamp(18px, 3vw, 28px); border: 1px solid #eaecf0; border-radius: 20px; background: #fff; box-shadow: 0 8px 24px rgba(16, 24, 40, .06); }
.wizard-main-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding-bottom: 22px; border-bottom: 1px solid #eaecf0; }
.wizard-eyebrow { color: #175cd3; font-size: .75rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.wizard-main-heading h2 { margin-top: 6px; color: #101828; font-size: clamp(1.45rem, 3vw, 2rem); font-weight: 800; letter-spacing: -.035em; }
.wizard-main-heading-copy > p:last-child { margin-top: 6px; color: #667085; font-size: .95rem; }
.wizard-role-chip { flex: 0 0 auto; padding: 6px 10px; border-radius: 999px; color: #1849a9; background: #eff8ff; font-size: 12px; font-weight: 800; }
.wizard-main-content { padding-top: 24px; }
.teacher-wizard-shell :deep(.admin-content) { display: grid; align-content: start; gap: 20px; }

/* Panel langkah disajikan sebagai seksi di dalam kartu isi: tepi lembut
   border-soft dan tanpa bayangan berat agar tidak terasa kartu-di-dalam-kartu.
   Semua override berlingkup shell guru; gaya dasar komponen (yang juga
   dipakai admin) tidak diubah. */
.teacher-wizard-shell :deep(.panel) { border: 1px solid #eaecf0; border-radius: 16px; box-shadow: none; }
.teacher-wizard-shell :deep(.curriculum-panel) { border-color: #eaecf0; box-shadow: none; }
.teacher-wizard-shell :deep(.teacher-classes-panel) { margin: 0; border-color: #eaecf0; border-radius: 16px; box-shadow: none; }
.teacher-wizard-shell :deep(.users-panel .panel) { border-color: #eaecf0; box-shadow: none; }
.teacher-wizard-shell :deep(.simple-report-header), .teacher-wizard-shell :deep(.simple-report-filters), .teacher-wizard-shell :deep(.simple-report-results) { border-color: #eaecf0; box-shadow: none; }
.teacher-wizard-shell :deep(.onboarding-panel), .teacher-wizard-shell :deep(.onboarding-collapsed) { border-color: #eaecf0; box-shadow: none; }

@media (max-width: 900px) {
  .teacher-wizard-shell.teacher-wizard-shell { padding: 16px 14px 40px; }
  .wizard-page-header { padding: 20px 0 18px; }
  .wizard-layout { grid-template-columns: 1fr; gap: 16px; }
  .wizard-sidebar { position: static; padding: 16px; }
  .wizard-steps { display: flex; flex-direction: row; gap: 8px; overflow-x: auto; margin-top: 16px; padding-bottom: 4px; }
  .wizard-steps::before { display: none; }
  .wizard-step { flex: 0 0 auto; grid-template-columns: 40px auto; width: auto; padding: 6px 12px 6px 6px; }
  .wizard-step-copy small { display: none; }
  .wizard-step-title-desktop { display: none; }
  .wizard-step-title-mobile { display: inline; }
  .wizard-side-note { display: none; }
  .wizard-sidebar-footer { flex-direction: row; flex-wrap: wrap; margin-top: 14px; }
  .wizard-main { padding: 18px 14px; }
  .wizard-main-heading { flex-wrap: wrap; }
}
</style>
