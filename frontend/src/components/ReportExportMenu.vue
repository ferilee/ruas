<template>
  <div ref="menuRef" :class="['export-menu', `export-menu--${props.variant}`]">
    <button type="button" class="export-menu-trigger" aria-haspopup="menu" :aria-controls="menuId" :aria-expanded="menuOpen" :disabled="props.disabled" @click="toggleMenu">{{ props.label }} <span aria-hidden="true">▾</span></button>
    <div v-if="menuOpen" :id="menuId" class="export-menu-panel" role="menu" aria-label="Pilihan ekspor PDF">
      <button type="button" class="export-menu-item" role="menuitem" :disabled="props.questionsDisabled" :title="props.questionsDisabled ? props.questionsReason : undefined" @click="selectMode('questions')">
        <strong>PDF Analisis per Soal</strong>
        <small>Tabel persentase benar untuk semua soal sesuai filter.</small>
      </button>
      <button type="button" class="export-menu-item" role="menuitem" :disabled="props.studentsDisabled" :title="props.studentsDisabled ? props.studentsReason : undefined" @click="selectMode('students')">
        <strong>PDF Hasil Siswa</strong>
        <small>Daftar nilai resmi setiap siswa sesuai filter.</small>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, useId } from 'vue';
import type { ReportPrintMode } from '@/lib/report-print';

const props = withDefaults(defineProps<{
  disabled?: boolean;
  questionsDisabled?: boolean;
  studentsDisabled?: boolean;
  questionsReason?: string;
  studentsReason?: string;
  variant?: 'light' | 'dark';
  label?: string;
}>(), {
  disabled: false,
  questionsDisabled: false,
  studentsDisabled: false,
  questionsReason: 'Belum ada analisis per soal untuk diunduh',
  studentsReason: 'Belum ada hasil untuk diunduh',
  variant: 'light',
  label: 'Unduh PDF',
});

const emit = defineEmits<{ select: [mode: ReportPrintMode] }>();

const menuId = useId();
const menuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
}

function selectMode(mode: ReportPrintMode) {
  closeMenu();
  emit('select', mode);
}

function onDocumentClick(event: MouseEvent) {
  if (!menuOpen.value) return;
  if (menuRef.value && event.target instanceof Node && !menuRef.value.contains(event.target)) closeMenu();
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMenu();
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);
});
onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onDocumentKeydown);
});
</script>

<style scoped>
.export-menu { position: relative; display: inline-block; }
.export-menu-trigger { border: 0; border-radius: 8px; padding: 10px 15px; font: inherit; font-size: .82rem; font-weight: 700; cursor: pointer; white-space: nowrap; color: #fff; background: #1e40af; }
.export-menu-trigger:disabled { opacity: .55; cursor: default; }
.export-menu--light .export-menu-trigger { color: #1555ae; background: #fff; }
.export-menu--dark .export-menu-trigger { color: #fff; background: #7350c7; }
.export-menu-panel { position: absolute; z-index: 30; top: calc(100% + 6px); right: 0; display: flex; min-width: 248px; flex-direction: column; gap: 4px; padding: 6px; border: 1px solid #d8e2ef; border-radius: 12px; background: #fff; box-shadow: 0 18px 44px rgba(16, 39, 73, .22); }
.export-menu-item { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border: 0; border-radius: 8px; color: #294c7a; background: transparent; font: inherit; text-align: left; cursor: pointer; }
.export-menu-item:hover:not(:disabled) { background: #edf6ff; }
.export-menu-item:disabled { opacity: .55; cursor: default; }
.export-menu-item strong { font-size: .84rem; }
.export-menu-item small { color: #71849b; font-size: .72rem; line-height: 1.4; }
</style>
