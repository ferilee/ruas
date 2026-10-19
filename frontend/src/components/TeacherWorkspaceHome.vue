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
    <p class="teacher-workspace-section-label">MULAI MENYIAPKAN</p>

    <div class="teacher-workspace-grid">
      <button v-for="card in cards" :key="card.id" class="teacher-workspace-card" type="button" @click="emit('create', card.id)">
        <span :class="['teacher-workspace-icon', `tone-${card.tone}`]" aria-hidden="true">{{ card.icon }}</span>
        <span class="teacher-workspace-card-copy">
          <strong>{{ card.title }}</strong>
          <small>{{ card.description }}</small>
          <em>{{ card.countLabel }}</em>
        </span>
        <span class="teacher-workspace-arrow" aria-hidden="true">→</span>
      </button>
    </div>

    <p class="teacher-workspace-hint">Setelah struktur dasar tersedia, Anda dapat mengatur jadwal, laporan, dan pengaturan lain melalui navigasi aplikasi.</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type WorkspaceAction = 'class' | 'assessment-type' | 'subject' | 'topic' | 'question';
type CardTone = 'blue' | 'violet' | 'green' | 'amber' | 'pink';

const props = defineProps<{
  classCount: number;
  assessmentTypeCount: number;
  subjectCount: number;
  topicCount: number;
  questionCount: number;
}>();

const emit = defineEmits<{ create: [action: WorkspaceAction] }>();

const cards = computed<Array<{
  id: WorkspaceAction;
  title: string;
  description: string;
  countLabel: string;
  icon: string;
  tone: CardTone;
}>>(() => [
  {
    id: 'class',
    title: 'Tambah Kelas',
    description: 'Buat kelas untuk menampung siswa dan asesmen.',
    countLabel: `${props.classCount} kelas tersedia`,
    icon: '▦',
    tone: 'blue',
  },
  {
    id: 'assessment-type',
    title: 'Tambah Jenis Asesmen',
    description: 'Tentukan format seperti latihan atau ujian.',
    countLabel: `${props.assessmentTypeCount} jenis tersedia`,
    icon: '◷',
    tone: 'violet',
  },
  {
    id: 'subject',
    title: 'Tambah Mata Pelajaran',
    description: 'Atur mata pelajaran yang digunakan dalam asesmen.',
    countLabel: `${props.subjectCount} mata pelajaran tersedia`,
    icon: '∑',
    tone: 'green',
  },
  {
    id: 'topic',
    title: 'Tambah Topik',
    description: 'Buat paket soal dan tentukan kelas yang dapat mengaksesnya.',
    countLabel: `${props.topicCount} topik tersedia`,
    icon: '◈',
    tone: 'amber',
  },
  {
    id: 'question',
    title: 'Tambah Soal',
    description: 'Buat soal baru untuk dimasukkan ke dalam topik.',
    countLabel: `${props.questionCount} soal tersedia`,
    icon: '?',
    tone: 'pink',
  },
]);
</script>

<style scoped>
.teacher-workspace-home {
  min-height: calc(100vh - 190px);
  padding: clamp(28px, 5vw, 58px) clamp(20px, 5vw, 58px) 42px;
  border-radius: 18px;
  color: #f6f2eb;
  background: #111115;
  box-shadow: 0 18px 42px rgba(24, 18, 37, .16);
}

.teacher-workspace-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.teacher-workspace-eyebrow, .teacher-workspace-section-label { color: #8da4ff; font-size: .67rem; font-weight: 800; letter-spacing: .16em; }
.teacher-workspace-heading h2 { max-width: 760px; margin-top: 15px; color: #f7f2eb; font-size: clamp(2rem, 4vw, 3.55rem); font-weight: 800; letter-spacing: -.045em; line-height: 1.02; }
.teacher-workspace-heading h2::first-letter { color: #f7f2eb; }
.teacher-workspace-heading p { margin-top: 18px; color: #9e9aa5; font-size: .95rem; }
.teacher-workspace-badge { padding: 8px 11px; border: 1px solid #3e3d48; border-radius: 999px; color: #aab8ff; font-size: .65rem; font-weight: 800; letter-spacing: .08em; white-space: nowrap; }
.teacher-workspace-divider { height: 1px; margin: 42px 0 27px; background: #3b3a41; }
.teacher-workspace-section-label { margin-bottom: 16px; color: #92909b; font-size: .62rem; }
.teacher-workspace-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
.teacher-workspace-card { display: flex; min-height: 158px; align-items: flex-start; gap: 16px; padding: 20px; border: 1px solid #3d3c43; border-radius: 3px; color: #fff; background: #202023; font: inherit; text-align: left; cursor: pointer; transition: border-color .18s ease, background .18s ease, transform .18s ease; }
.teacher-workspace-card:hover { border-color: #7473a5; background: #26262c; transform: translateY(-2px); }
.teacher-workspace-card:focus-visible { outline: 2px solid #9aa7ff; outline-offset: 3px; }
.teacher-workspace-icon { display: grid; width: 40px; height: 40px; flex: 0 0 auto; place-items: center; border: 1px solid currentColor; font-size: 1.25rem; font-weight: 700; }
.teacher-workspace-icon.tone-blue { color: #91a8ff; background: #202d5b; }
.teacher-workspace-icon.tone-violet { color: #dc9cff; background: #3c1954; }
.teacher-workspace-icon.tone-green { color: #70eee8; background: #123f43; }
.teacher-workspace-icon.tone-amber { color: #f0d466; background: #4c3b13; }
.teacher-workspace-icon.tone-pink { color: #ff94c8; background: #521d3b; }
.teacher-workspace-card-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 9px; }
.teacher-workspace-card-copy strong { color: #f8f3ed; font-size: 1rem; text-transform: uppercase; }
.teacher-workspace-card-copy small { max-width: 330px; color: #aaa6b0; font-size: .83rem; line-height: 1.55; }
.teacher-workspace-card-copy em { color: #77747f; font-size: .68rem; font-style: normal; }
.teacher-workspace-arrow { display: grid; width: 28px; height: 28px; flex: 0 0 auto; place-items: center; border: 1px solid #4b4a52; color: #cbc8d0; font-size: 1rem; }
.teacher-workspace-hint { max-width: 700px; margin-top: 28px; color: #77747f; font-size: .76rem; line-height: 1.55; }

@media (max-width: 720px) {
  .teacher-workspace-home { min-height: calc(100vh - 130px); padding: 28px 18px 34px; }
  .teacher-workspace-heading { flex-direction: column; }
  .teacher-workspace-heading h2 { font-size: 2.3rem; }
  .teacher-workspace-divider { margin-top: 30px; }
  .teacher-workspace-grid { grid-template-columns: 1fr; }
}
</style>
