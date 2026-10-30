<template>
  <div ref="root" :class="['question-topic-picker', { open }]">
    <span class="question-topic-picker-label" aria-hidden="true">Topik yang dikerjakan</span>
    <button
      class="question-topic-picker-trigger"
      type="button"
      role="combobox"
      aria-label="Pilih topik yang dikerjakan"
      :aria-expanded="open"
      :aria-controls="menuId"
      :title="selectedLabel"
      @click.stop="toggle"
      @keydown="handleTriggerKeydown"
    >
      <span class="question-topic-picker-value">{{ selectedLabel }}</span>
      <span class="question-topic-picker-count">{{ selectedCount }} soal</span>
      <span class="question-topic-picker-chevron" aria-hidden="true">⌄</span>
    </button>

    <div v-if="open" :id="menuId" class="question-topic-picker-menu" role="listbox" aria-label="Daftar topik">
      <label class="question-topic-picker-search">
        <span class="sr-only">Cari topik</span>
        <input v-model.trim="searchQuery" type="search" placeholder="Cari topik atau mata pelajaran..." autocomplete="off" @click.stop @keydown.stop="handleSearchKeydown" />
      </label>
      <button
        type="button"
        role="option"
        :aria-selected="modelValue === null"
        :class="['question-topic-picker-option', 'question-topic-picker-all', { selected: modelValue === null }]"
        @click.stop="choose(null)"
      >
        <span class="question-topic-picker-option-label">Semua topik</span>
        <span class="question-topic-picker-option-count">{{ totalQuestionCount }} soal</span>
        <span v-if="modelValue === null" class="question-topic-picker-check" aria-hidden="true">✓</span>
      </button>
      <template v-for="group in visibleGroups" :key="group.subjectId">
        <div class="question-topic-picker-group" aria-hidden="true">{{ group.label }}</div>
        <button
          v-for="topic in group.topics"
          :key="topic.id"
          type="button"
          role="option"
          :aria-selected="modelValue === topic.id"
          :class="['question-topic-picker-option', { selected: modelValue === topic.id }]"
          @click.stop="choose(topic.id)"
        >
          <span class="question-topic-picker-option-label">{{ topic.label }}</span>
          <span class="question-topic-picker-option-count">{{ topic.question_count ?? 0 }} soal</span>
          <span v-if="modelValue === topic.id" class="question-topic-picker-check" aria-hidden="true">✓</span>
        </button>
      </template>
      <span v-if="filteredTopics.length === 0" class="question-topic-picker-empty">Tidak ada topik yang cocok</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { AdminTopic } from '@/types';
import { groupQuestionTopicsBySubject } from '@/lib/question-topic-context';

// Pemilih konteks topik untuk langkah Soal guru: RuasSelect tidak mendukung
// opsi berkelompok, jadi pemilih ini meniru pola interaksinya (dropdown,
// pencarian, tutup saat klik di luar) tetapi mengelompokkan topik per mata
// pelajaran seperti daftar topik pada langkah Topik. Nilai null berarti
// mode bank global "Semua topik".
const props = withDefaults(defineProps<{
  modelValue: number | null;
  topics: AdminTopic[];
  subjects?: Array<{ id: number; label: string }>;
}>(), {
  subjects: () => [],
});

const emit = defineEmits<{
  'update:modelValue': [value: number | null];
  change: [value: number | null];
}>();

const root = ref<HTMLElement | null>(null);
const open = ref(false);
const searchQuery = ref('');
const menuId = `question-topic-picker-${Math.random().toString(36).slice(2, 9)}`;

const selectedTopic = computed(() => props.topics.find((topic) => topic.id === props.modelValue) ?? null);
const selectedLabel = computed(() => (selectedTopic.value
  ? `${selectedTopic.value.subject_label} — ${selectedTopic.value.label}`
  : 'Semua topik'));
const totalQuestionCount = computed(() => props.topics.reduce((total, topic) => total + (topic.question_count ?? 0), 0));
const selectedCount = computed(() => (selectedTopic.value ? selectedTopic.value.question_count ?? 0 : totalQuestionCount.value));

const filteredTopics = computed(() => {
  const query = searchQuery.value.toLocaleLowerCase('id-ID');
  if (!query) return props.topics;
  return props.topics.filter((topic) => `${topic.label} ${topic.subject_label} ${topic.slug}`.toLocaleLowerCase('id-ID').includes(query));
});
const visibleGroups = computed(() => groupQuestionTopicsBySubject(filteredTopics.value, props.subjects));

function toggle() {
  open.value = !open.value;
  if (open.value) searchQuery.value = '';
}

function choose(value: number | null) {
  emit('update:modelValue', value);
  emit('change', value);
  open.value = false;
  searchQuery.value = '';
}

function handleTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false;
}

function handleSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    open.value = false;
    searchQuery.value = '';
  }
}

function handleDocumentClick(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false;
}

onMounted(() => document.addEventListener('click', handleDocumentClick));
onUnmounted(() => document.removeEventListener('click', handleDocumentClick));
</script>

<style scoped>
.question-topic-picker { position: relative; z-index: 1; min-width: 0; }
.question-topic-picker.open { z-index: 100; }
.question-topic-picker-label { display: block; margin-bottom: 6px; color: #175cd3; font-size: .68rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.question-topic-picker-trigger { display: flex; width: 100%; min-width: 0; min-height: 46px; align-items: center; gap: 10px; padding: 10px 13px; border: 1px solid #d0d5dd; border-radius: 12px; color: #101828; background: #fff; font: inherit; font-size: .86rem; font-weight: 700; text-align: left; cursor: pointer; transition: border-color .16s ease, box-shadow .16s ease; }
.question-topic-picker-trigger:hover, .question-topic-picker.open .question-topic-picker-trigger { border-color: #175cd3; box-shadow: 0 0 0 3px rgba(23, 92, 211, .12); }
.question-topic-picker-trigger:focus-visible { outline: 3px solid rgba(23, 92, 211, .25); outline-offset: 2px; }
.question-topic-picker-value { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.question-topic-picker-count { flex: 0 0 auto; padding: 3px 9px; border-radius: 999px; color: #1849a9; background: #eff8ff; font-size: .72rem; font-weight: 800; }
.question-topic-picker-chevron { flex: 0 0 auto; color: #667085; font-size: 1rem; font-weight: 800; }
.question-topic-picker-menu { position: absolute; top: calc(100% + 6px); right: 0; left: 0; max-height: 330px; overflow-y: auto; padding: 7px; border: 1px solid #d0d5dd; border-radius: 14px; background: #fff; box-shadow: 0 16px 38px rgba(16, 24, 40, .16); }
.question-topic-picker-search { display: block; padding: 2px 2px 7px; }
.question-topic-picker-search input { width: 100%; min-width: 0; box-sizing: border-box; padding: 9px 11px; border: 1px solid #d0d5dd; border-radius: 9px; color: #101828; background: #fff; font: inherit; font-size: .8rem; }
.question-topic-picker-group { padding: 9px 10px 4px; color: #667085; font-size: .66rem; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; }
.question-topic-picker-option { display: flex; width: 100%; min-width: 0; align-items: center; gap: 9px; padding: 9px 10px; border: 0; border-radius: 9px; color: #101828; background: transparent; font: inherit; font-size: .82rem; text-align: left; cursor: pointer; }
.question-topic-picker-option:hover { background: #eff8ff; }
.question-topic-picker-option.selected { color: #1849a9; background: #eff8ff; font-weight: 700; }
.question-topic-picker-option-label { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.question-topic-picker-option-count { flex: 0 0 auto; color: #667085; font-size: .72rem; font-weight: 600; }
.question-topic-picker-option.selected .question-topic-picker-option-count { color: #1849a9; }
.question-topic-picker-check { flex: 0 0 auto; color: #175cd3; font-weight: 900; }
.question-topic-picker-all { border-bottom: 1px solid #eaecf0; border-radius: 9px 9px 0 0; font-weight: 700; }
.question-topic-picker-empty { display: block; padding: 10px; color: #667085; font-size: .8rem; }
.sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }
</style>
