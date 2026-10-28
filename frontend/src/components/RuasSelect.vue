<template>
  <div ref="root" :class="['ruas-select', { open, disabled }]">
    <button
      class="ruas-select-trigger"
      type="button"
      role="combobox"
      :aria-label="ariaLabel"
      :aria-expanded="open"
      :aria-controls="menuId"
      :title="selectedOption?.label ?? placeholder"
      :disabled="disabled"
      @click.stop="toggle"
      @keydown="handleKeydown"
    >
      <span :class="{ placeholder: !selectedOption }">{{ selectedOption?.label ?? placeholder }}</span>
      <span class="ruas-select-chevron" aria-hidden="true">⌄</span>
    </button>

    <div v-if="open" :id="menuId" class="ruas-select-menu" role="listbox">
      <label v-if="searchable" class="ruas-select-search">
        <span class="sr-only">Cari pilihan</span>
        <input v-model.trim="searchQuery" type="search" :placeholder="searchPlaceholder" autocomplete="off" @click.stop @keydown.stop="handleSearchKeydown" />
      </label>
      <button
        v-for="entry in visibleOptions"
        :key="`${entry.option.label}-${String(entry.option.value)}-${entry.index}`"
        :class="['ruas-select-option', { selected: isSelected(entry.option), highlighted: entry.index === highlightedIndex, disabled: entry.option.disabled }]"
        type="button"
        role="option"
        :aria-selected="isSelected(entry.option)"
        :disabled="entry.option.disabled"
        @mouseenter="highlightedIndex = entry.index"
        @click.stop="choose(entry.option)"
      >
        <span :title="entry.option.label">{{ entry.option.label }}</span>
        <span v-if="isSelected(entry.option)" class="ruas-select-check" aria-hidden="true">✓</span>
      </button>
      <span v-if="visibleOptions.length === 0" class="ruas-select-empty">Tidak ada pilihan yang cocok</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

export type RuasSelectValue = string | number | null | undefined;
export interface RuasSelectOption {
  value: RuasSelectValue;
  label: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<{
  modelValue: RuasSelectValue;
  options: RuasSelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}>(), {
  placeholder: 'Pilih pilihan...',
  ariaLabel: 'Pilih pilihan',
  disabled: false,
  searchable: false,
  searchPlaceholder: 'Cari pilihan...',
});

const emit = defineEmits<{
  'update:modelValue': [value: RuasSelectValue];
  change: [value: RuasSelectValue];
}>();

const root = ref<HTMLElement | null>(null);
const open = ref(false);
const highlightedIndex = ref(0);
const searchQuery = ref('');
const menuId = `ruas-select-${Math.random().toString(36).slice(2, 9)}`;

const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue));
const enabledIndexes = computed(() => props.options.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0));
const visibleOptions = computed(() => props.options
  .map((option, index) => ({ option, index }))
  .filter(({ option }) => option.label.toLocaleLowerCase().includes(searchQuery.value.toLocaleLowerCase())));

function isSelected(option: RuasSelectOption) {
  return option.value === props.modelValue;
}

function syncHighlight() {
  const selectedIndex = props.options.findIndex(isSelected);
  const visibleIndexes = visibleOptions.value.map(({ option, index }) => option.disabled ? -1 : index).filter((index) => index >= 0);
  highlightedIndex.value = visibleOptions.value.some(({ index }) => index === selectedIndex)
    ? selectedIndex
    : visibleIndexes[0] ?? enabledIndexes.value[0] ?? 0;
}

function toggle() {
  if (props.disabled) return;
  open.value = !open.value;
  if (open.value) {
    searchQuery.value = '';
    syncHighlight();
  }
}

function choose(option: RuasSelectOption) {
  if (option.disabled) return;
  emit('update:modelValue', option.value);
  emit('change', option.value);
  open.value = false;
  searchQuery.value = '';
}

function moveHighlight(direction: 1 | -1) {
  const indexes = enabledIndexes.value;
  if (indexes.length === 0) return;
  const currentPosition = Math.max(0, indexes.indexOf(highlightedIndex.value));
  const nextPosition = (currentPosition + direction + indexes.length) % indexes.length;
  highlightedIndex.value = indexes[nextPosition] ?? indexes[0];
}

function handleKeydown(event: KeyboardEvent) {
  if (props.disabled) return;
  if (event.key === 'Escape') {
    open.value = false;
    return;
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!open.value) {
      open.value = true;
      syncHighlight();
    } else {
      moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
    }
    return;
  }
  if ((event.key === 'Enter' || event.key === ' ') && open.value) {
    event.preventDefault();
    const option = props.options[highlightedIndex.value];
    if (option) choose(option);
  }
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

watch(() => props.modelValue, syncHighlight);
watch(searchQuery, syncHighlight);
onMounted(() => document.addEventListener('click', handleDocumentClick));
onUnmounted(() => document.removeEventListener('click', handleDocumentClick));
</script>

<style scoped>
.ruas-select { position: relative; z-index: 1; width: 100%; }
.ruas-select.open { z-index: 100; }
.ruas-select-trigger { display: flex; width: 100%; min-height: 44px; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 13px; border: 1px solid #d6e3f2; border-radius: 12px; color: #294c7a; background: linear-gradient(145deg, #fff, #f4f8ff); box-shadow: 0 5px 12px rgba(35, 91, 160, .07); font: inherit; font-size: .8rem; text-align: left; cursor: pointer; transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease; }
.ruas-select-trigger > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ruas-select-trigger:hover, .ruas-select.open .ruas-select-trigger { border-color: #6ca7ea; box-shadow: 0 8px 17px rgba(35, 101, 199, .14); }
.ruas-select.open .ruas-select-trigger { transform: translateY(-1px); }
.ruas-select-trigger:focus-visible { outline: 3px solid rgba(35, 139, 255, .2); outline-offset: 2px; }
.ruas-select-trigger .placeholder { color: #879dbc; }
.ruas-select-chevron { color: #2671c9; font-size: 1rem; font-weight: 800; line-height: 1; transition: transform .16s ease; }
.ruas-select.open .ruas-select-chevron { transform: rotate(180deg); }
.ruas-select.disabled .ruas-select-trigger { color: #8da1ba; background: #edf3fa; box-shadow: none; cursor: not-allowed; }
.ruas-select-menu { position: absolute; z-index: 101; top: calc(100% + 7px); right: 0; left: 0; display: flex; max-height: min(320px, calc(100vh - 120px)); flex-direction: column; overflow-y: auto; overflow-x: hidden; padding: 6px; border: 1px solid #d5e4f5; border-radius: 14px; background: rgba(255, 255, 255, .99); box-shadow: 0 18px 34px rgba(31, 74, 126, .2); backdrop-filter: blur(10px); }
.ruas-select-search { position: sticky; z-index: 1; top: -6px; display: block; padding: 3px 2px 8px; background: rgba(255, 255, 255, .99); }
.ruas-select-search input { width: 100%; min-height: 36px; padding: 8px 10px; border: 1px solid #cbdced; border-radius: 9px; outline: none; color: #294c7a; background: #f7faff; font: inherit; font-size: .76rem; }
.ruas-select-search input:focus { border-color: #6ca7ea; box-shadow: 0 0 0 3px rgba(35, 139, 255, .13); }
.ruas-select-option { display: flex; min-height: 38px; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 11px; border: 0; border-radius: 9px; color: #385b86; background: transparent; font: inherit; font-size: .77rem; line-height: 1.25; text-align: left; cursor: pointer; }
.ruas-select-option > span:first-child { min-width: 0; overflow-wrap: anywhere; white-space: normal; line-height: 1.4; text-align: left; }
.ruas-select-option:hover, .ruas-select-option.highlighted { color: #194f9f; background: #edf5ff; }
.ruas-select-option.selected { color: #fff; background: linear-gradient(105deg, #287bd7, #2251b5); font-weight: 700; box-shadow: 0 5px 11px rgba(35, 101, 199, .18); }
.ruas-select-option.disabled { color: #a7b5c5; cursor: not-allowed; }
.ruas-select-check { font-weight: 900; }
.ruas-select-empty { padding: 12px 11px; color: #8da1ba; font-size: .75rem; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>
