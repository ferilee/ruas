<template>
  <section class="teacher-workspace-home" aria-labelledby="teacher-workspace-title">
    <div class="teacher-workspace-heading">
      <div>
        <span class="teacher-workspace-eyebrow">RUANG KERJA GURU</span>
        <h2 id="teacher-workspace-title">Apa yang ingin Anda siapkan hari ini?</h2>
        <p>Mulai dari satu langkah untuk menyiapkan asesmen kelas Anda.</p>
      </div>
      <span class="teacher-workspace-badge">RUAS · GURU</span>
    </div>

    <div class="teacher-workspace-divider" aria-hidden="true"></div>
    <p class="teacher-workspace-section-label">RUANG KERJA</p>

    <div class="teacher-workspace-grid">
      <article class="teacher-workspace-card workspace-actions-card">
        <div class="workspace-card-heading">
          <span class="teacher-workspace-icon tone-blue" aria-hidden="true">＋</span>
          <div><strong>Aksi Cepat</strong><small>Mulai menyiapkan bagian utama asesmen.</small></div>
        </div>
        <div class="workspace-action-grid">
          <button v-for="action in actions" :key="action.id" class="workspace-action-button" type="button" @click="emit('create', action.id)">
            <span :class="['workspace-action-icon', `tone-${action.tone}`]" aria-hidden="true">{{ action.icon }}</span>
            <span>{{ action.label }}</span>
          </button>
        </div>
      </article>

      <article class="teacher-workspace-card workspace-overview-card">
        <div class="workspace-card-heading">
          <span class="teacher-workspace-icon tone-pink" aria-hidden="true">▤</span>
          <div><strong>Bank Soal & Struktur</strong><small>Kelola isi dan susunan asesmen.</small></div>
        </div>
        <div class="workspace-mini-links">
          <button class="workspace-mini-link" type="button" @click="emit('navigate', 'questions')">
            <span><b>Daftar Soal</b><small>{{ props.questionCount }} soal tersedia</small></span><i aria-hidden="true">→</i>
          </button>
          <button class="workspace-mini-link" type="button" @click="emit('navigate', 'curriculum')">
            <span><b>Struktur Asesmen</b><small>{{ structureCountLabel }}</small></span><i aria-hidden="true">→</i>
          </button>
        </div>
      </article>

      <button class="teacher-workspace-card workspace-link-card" type="button" @click="emit('navigate', 'reports')">
        <span class="teacher-workspace-icon tone-violet" aria-hidden="true">▥</span>
        <span class="teacher-workspace-card-copy"><strong>Laporan Asesmen</strong><small>Pantau hasil siswa dan siapkan laporan.</small><em>Lihat hasil dan analisis asesmen</em></span>
        <span class="teacher-workspace-arrow" aria-hidden="true">→</span>
      </button>

      <button class="teacher-workspace-card workspace-link-card" type="button" @click="emit('navigate', 'schedule')">
        <span class="teacher-workspace-icon tone-amber" aria-hidden="true">◷</span>
        <span class="teacher-workspace-card-copy"><strong>Jadwal Asesmen</strong><small>Atur kapan topik dapat dikerjakan siswa.</small><em>{{ props.scheduleCount }} topik memiliki jadwal</em></span>
        <span class="teacher-workspace-arrow" aria-hidden="true">→</span>
      </button>

      <button class="teacher-workspace-card workspace-link-card" type="button" @click="emit('navigate', 'users')">
        <span class="teacher-workspace-icon tone-green" aria-hidden="true">♙</span>
        <span class="teacher-workspace-card-copy"><strong>Daftar Pengguna</strong><small>Kelola siswa yang berada dalam penetapan Anda.</small><em>{{ props.participantCount }} siswa terdaftar</em></span>
        <span class="teacher-workspace-arrow" aria-hidden="true">→</span>
      </button>
    </div>

    <p class="teacher-workspace-hint">Pilih kartu untuk membuka pengelolaan yang Anda perlukan. Navigasi tambahan tetap tersedia di perangkat mobile.</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type WorkspaceAction = 'class' | 'assessment-type' | 'subject' | 'topic' | 'question';
type WorkspaceSection = 'curriculum' | 'questions' | 'reports' | 'schedule' | 'users';
type CardTone = 'blue' | 'violet' | 'green' | 'amber' | 'pink';

const props = defineProps<{
  classCount: number;
  assessmentTypeCount: number;
  subjectCount: number;
  topicCount: number;
  questionCount: number;
  scheduleCount: number;
  participantCount: number;
}>();

const emit = defineEmits<{
  create: [action: WorkspaceAction];
  navigate: [section: WorkspaceSection];
}>();

const actions: Array<{ id: WorkspaceAction; label: string; icon: string; tone: CardTone }> = [
  { id: 'class', label: 'Tambah Kelas', icon: '▦', tone: 'blue' },
  { id: 'assessment-type', label: 'Tambah Jenis Asesmen', icon: '◷', tone: 'violet' },
  { id: 'subject', label: 'Tambah Mata Pelajaran', icon: '∑', tone: 'green' },
  { id: 'topic', label: 'Tambah Topik', icon: '◈', tone: 'amber' },
  { id: 'question', label: 'Tambah Soal', icon: '?', tone: 'pink' },
];

const structureCountLabel = computed(() => `${props.classCount} kelas · ${props.subjectCount} mapel · ${props.assessmentTypeCount} jenis · ${props.topicCount} topik`);
</script>

<style scoped>
.teacher-workspace-home { min-height: calc(100vh - 190px); padding: clamp(28px, 5vw, 58px) clamp(20px, 5vw, 58px) 42px; border-radius: 18px; color: #f6f2eb; background: #111115; box-shadow: 0 18px 42px rgba(24, 18, 37, .16); }
.teacher-workspace-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.teacher-workspace-eyebrow, .teacher-workspace-section-label { color: #8da4ff; font-size: .67rem; font-weight: 800; letter-spacing: .16em; }
.teacher-workspace-heading h2 { max-width: 760px; margin-top: 15px; color: #f7f2eb; font-size: clamp(2rem, 4vw, 3.55rem); font-weight: 800; letter-spacing: -.045em; line-height: 1.02; }
.teacher-workspace-heading p { margin-top: 18px; color: #9e9aa5; font-size: .95rem; }
.teacher-workspace-badge { padding: 8px 11px; border: 1px solid #3e3d48; border-radius: 999px; color: #aab8ff; font-size: .65rem; font-weight: 800; letter-spacing: .08em; white-space: nowrap; }
.teacher-workspace-divider { height: 1px; margin: 42px 0 27px; background: #3b3a41; }
.teacher-workspace-section-label { margin-bottom: 16px; color: #92909b; font-size: .62rem; }
.teacher-workspace-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
.teacher-workspace-card { display: flex; min-width: 0; min-height: 158px; align-items: flex-start; gap: 16px; padding: 20px; border: 1px solid #3d3c43; border-radius: 3px; color: #fff; background: #202023; font: inherit; text-align: left; cursor: pointer; transition: border-color .18s ease, background .18s ease, transform .18s ease; }
.teacher-workspace-card:hover { border-color: #7473a5; background: #26262c; transform: translateY(-2px); }
.teacher-workspace-card:focus-visible, .workspace-action-button:focus-visible, .workspace-mini-link:focus-visible { outline: 2px solid #9aa7ff; outline-offset: 3px; }
.workspace-actions-card { display: block; grid-column: 1 / -1; min-height: 0; cursor: default; }
.workspace-actions-card:hover { transform: none; }
.workspace-card-heading { display: flex; align-items: center; gap: 14px; }
.workspace-card-heading > div { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
.workspace-card-heading strong { color: #f8f3ed; font-size: 1rem; text-transform: uppercase; }
.workspace-card-heading small { color: #aaa6b0; font-size: .78rem; }
.teacher-workspace-icon { display: grid; width: 40px; height: 40px; flex: 0 0 auto; place-items: center; border: 1px solid currentColor; font-size: 1.25rem; font-weight: 700; }
.teacher-workspace-icon.tone-blue, .workspace-action-icon.tone-blue { color: #91a8ff; background: #202d5b; }
.teacher-workspace-icon.tone-violet, .workspace-action-icon.tone-violet { color: #dc9cff; background: #3c1954; }
.teacher-workspace-icon.tone-green, .workspace-action-icon.tone-green { color: #70eee8; background: #123f43; }
.teacher-workspace-icon.tone-amber, .workspace-action-icon.tone-amber { color: #f0d466; background: #4c3b13; }
.teacher-workspace-icon.tone-pink, .workspace-action-icon.tone-pink { color: #ff94c8; background: #521d3b; }
.workspace-action-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 9px; margin-top: 20px; }
.workspace-action-button { display: flex; min-width: 0; min-height: 76px; flex-direction: column; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 11px; border: 1px solid #3d3c43; color: #d5d1d8; background: #25252a; font: inherit; font-size: .72rem; font-weight: 700; text-align: left; cursor: pointer; transition: border-color .18s ease, background .18s ease; }
.workspace-action-button:hover { border-color: #7466a4; background: #393542; }
.workspace-action-icon { display: grid; width: 25px; height: 25px; place-items: center; border: 1px solid currentColor; font-size: .85rem; }
.workspace-overview-card { display: block; cursor: default; }
.workspace-overview-card:hover { transform: none; }
.workspace-mini-links { display: grid; gap: 8px; margin-top: 18px; }
.workspace-mini-link { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; border: 1px solid #3d3c43; color: #d5d1d8; background: #25252a; font: inherit; text-align: left; cursor: pointer; transition: border-color .18s ease, background .18s ease; }
.workspace-mini-link:hover { border-color: #7466a4; background: #393542; }
.workspace-mini-link span { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
.workspace-mini-link b { color: #f0ebf2; font-size: .76rem; }
.workspace-mini-link small { overflow: hidden; color: #96919d; font-size: .67rem; text-overflow: ellipsis; white-space: nowrap; }
.workspace-mini-link i { color: #bca7ff; font-size: 1.05rem; font-style: normal; }
.workspace-link-card { align-items: flex-start; }
.teacher-workspace-card-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 9px; }
.teacher-workspace-card-copy strong { color: #f8f3ed; font-size: 1rem; text-transform: uppercase; }
.teacher-workspace-card-copy small { max-width: 330px; color: #aaa6b0; font-size: .83rem; line-height: 1.55; }
.teacher-workspace-card-copy em { color: #77747f; font-size: .68rem; font-style: normal; }
.teacher-workspace-arrow { display: grid; width: 28px; height: 28px; flex: 0 0 auto; place-items: center; border: 1px solid #4b4a52; color: #cbc8d0; font-size: 1rem; }
.teacher-workspace-hint { max-width: 700px; margin-top: 28px; color: #77747f; font-size: .76rem; line-height: 1.55; }

@media (max-width: 900px) { .workspace-action-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 720px) {
  .teacher-workspace-home { min-height: calc(100vh - 130px); padding: 28px 18px 34px; }
  .teacher-workspace-heading { flex-direction: column; }
  .teacher-workspace-heading h2 { font-size: 2.3rem; }
  .teacher-workspace-divider { margin-top: 30px; }
  .teacher-workspace-grid { grid-template-columns: 1fr; }
  .workspace-actions-card { grid-column: auto; }
  .workspace-action-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
