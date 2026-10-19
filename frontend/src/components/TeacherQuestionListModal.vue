<template>
  <section class="teacher-question-list-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-question-list-title">
    <div class="teacher-question-list-heading">
      <div><span class="modal-eyebrow">BANK SOAL</span><h2 id="teacher-question-list-title">Daftar Soal</h2><p>Cari soal yang sudah Anda siapkan atau tambahkan soal baru.</p></div>
      <button class="teacher-question-list-close" type="button" aria-label="Tutup daftar soal" @click="emit('close')">×</button>
    </div>

    <div class="teacher-question-list-toolbar">
      <label class="teacher-question-search">Cari soal
        <input v-model.trim="search" type="search" placeholder="Cari pertanyaan atau topik..." />
      </label>
      <button class="teacher-question-create" type="button" @click="emit('create')">＋ Tambah Soal</button>
    </div>

    <p class="teacher-question-count">{{ props.questionTotal }} soal tersedia</p>
    <div v-if="filteredQuestions.length === 0" class="teacher-question-empty">Soal tidak ditemukan.</div>
    <div v-else class="teacher-question-list">
      <button v-for="question in filteredQuestions" :key="question.id" type="button" class="teacher-question-row" @click="emit('edit', question.id)">
        <span class="teacher-question-row-number">#{{ question.id }}</span>
        <span class="teacher-question-row-copy"><strong><MathText :text="question.question_text" /></strong><small>{{ question.topic_label }} · {{ questionTypeLabel(question.type) }}</small></span>
        <span :class="['teacher-question-difficulty', `difficulty-${question.difficulty}`]">{{ difficultyLabel(question.difficulty) }}</span>
        <span class="teacher-question-row-arrow" aria-hidden="true">→</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import MathText from '@/components/MathText.vue';
import type { AdminQuestionListItem } from '@/types';

const props = defineProps<{
  questions: AdminQuestionListItem[];
  questionTotal: number;
}>();

const emit = defineEmits<{
  close: [];
  create: [];
  edit: [id: number];
}>();

const search = ref('');
const filteredQuestions = computed(() => {
  const query = search.value.toLocaleLowerCase('id-ID');
  if (!query) return props.questions;
  return props.questions.filter((question) => `${question.question_text} ${question.topic_label} ${question.external_id ?? ''}`.toLocaleLowerCase('id-ID').includes(query));
});

function difficultyLabel(value: AdminQuestionListItem['difficulty']) {
  return { easy: 'Mudah', medium: 'Sedang', hard: 'Sulit' }[value];
}

function questionTypeLabel(value: AdminQuestionListItem['type']) {
  return { single_choice: 'Pilihan ganda', multiple_response: 'Pilihan kompleks', true_false: 'Benar / Salah' }[value];
}
</script>

<style scoped>
.teacher-question-list-modal { color: #f6f2eb; }
.teacher-question-list-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding-bottom: 16px; border-bottom: 1px solid #3d3c43; }
.teacher-question-list-heading h2 { margin-top: 5px; color: #f7f2eb; font-size: 1.4rem; }
.teacher-question-list-heading p { margin-top: 5px; color: #9e9aa5; font-size: .82rem; }
.modal-eyebrow { color: #ff94c8; font-size: .64rem; font-weight: 800; letter-spacing: .14em; }
.teacher-question-list-close { display: grid; width: 32px; height: 32px; place-items: center; border: 0; border-radius: 50%; color: #c5c2ca; background: #35343c; font-size: 1.35rem; line-height: 1; cursor: pointer; }
.teacher-question-list-close:hover { color: #fff; background: #4a4654; }
.teacher-question-list-toolbar { display: flex; align-items: end; gap: 10px; margin-top: 18px; }
.teacher-question-search { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 6px; color: #d5d1d8; font-size: .75rem; }
.teacher-question-search input { width: 100%; padding: 10px 11px; border: 1px solid #4b4a52; border-radius: 8px; color: #f4f0ea; background: #1a1a1e; font: inherit; }
.teacher-question-search input::placeholder { color: #77747f; }
.teacher-question-create { padding: 10px 13px; border: 0; border-radius: 8px; color: #fff; background: #7350c7; font: inherit; font-size: .76rem; font-weight: 700; white-space: nowrap; cursor: pointer; }
.teacher-question-create:hover { background: #825edb; }
.teacher-question-count { margin: 15px 0 8px; color: #9b97a2; font-size: .74rem; }
.teacher-question-list { display: flex; max-height: min(54vh, 520px); flex-direction: column; overflow: auto; border: 1px solid #3d3c43; }
.teacher-question-row { display: grid; grid-template-columns: 42px minmax(0, 1fr) auto 22px; align-items: center; gap: 12px; width: 100%; padding: 13px 14px; border: 0; border-bottom: 1px solid #3d3c43; color: #d5d1d8; background: #25252a; font: inherit; text-align: left; cursor: pointer; }
.teacher-question-row:last-child { border-bottom: 0; }
.teacher-question-row:hover { background: #393542; }
.teacher-question-row-number { color: #bca7ff; font-size: .72rem; font-weight: 800; }
.teacher-question-row-copy { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
.teacher-question-row-copy strong { overflow: hidden; color: #f0ebf2; font-size: .8rem; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
.teacher-question-row-copy small { overflow: hidden; color: #96919d; font-size: .68rem; text-overflow: ellipsis; white-space: nowrap; }
.teacher-question-difficulty { padding: 4px 7px; border-radius: 999px; font-size: .64rem; font-weight: 700; white-space: nowrap; }
.teacher-question-difficulty.difficulty-easy { color: #70d9ac; background: #17382d; }.teacher-question-difficulty.difficulty-medium { color: #e3bd70; background: #45371e; }.teacher-question-difficulty.difficulty-hard { color: #f08d8d; background: #45272c; }
.teacher-question-row-arrow { color: #bca7ff; font-size: 1rem; }
.teacher-question-empty { padding: 30px 16px; border: 1px dashed #45444e; color: #9b97a2; text-align: center; }
@media (max-width: 560px) { .teacher-question-list-toolbar { align-items: stretch; flex-direction: column; }.teacher-question-create { width: 100%; }.teacher-question-row { grid-template-columns: 32px minmax(0, 1fr) 20px; gap: 8px; padding: 12px 10px; }.teacher-question-difficulty { display: none; }.teacher-question-row-copy strong { white-space: normal; } }
</style>
