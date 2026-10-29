<template>
  <div class="class-picker" :class="`theme-${theme}`" role="group" :aria-label="ariaLabel">
    <div class="class-picker-selected">
      <p class="class-picker-count" aria-live="polite">{{ modelValue.length }} kelas dipilih</p>
      <ul v-if="selectedOptions.length" class="class-picker-chips">
        <li v-for="item in selectedOptions" :key="item.id" class="class-picker-chip">
          <span class="class-picker-chip-label">{{ classOptionLabel(item) }}</span>
          <button
            class="class-picker-chip-remove"
            type="button"
            :disabled="disabled"
            :aria-label="`Lepas ${classOptionLabel(item)}`"
            @click="toggle(item.id, false)"
          >×</button>
        </li>
      </ul>
      <p v-else class="class-picker-empty-selection">{{ emptySelectionText }}</p>
    </div>

    <div class="class-picker-search">
      <label class="class-picker-search-label" :for="searchId">Cari kelas</label>
      <input
        :id="searchId"
        v-model="query"
        class="class-picker-search-input"
        type="search"
        :placeholder="searchPlaceholder"
        :disabled="disabled"
        autocomplete="off"
      />
    </div>

    <div class="class-picker-groups">
      <section v-for="group in groups" :key="group.key || 'lainnya'" class="class-picker-group">
        <div class="class-picker-group-header">
          <label class="class-picker-group-toggle">
            <input
              type="checkbox"
              :checked="groupState(group) === 'all'"
              :indeterminate="groupState(group) === 'some'"
              :disabled="disabled"
              :aria-label="`Pilih semua kelas tahun ajaran ${group.label}`"
              @change="toggleGroup(group, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ group.label }}</span>
          </label>
          <span class="class-picker-group-count">{{ groupSelectedCount(group) }}/{{ group.items.length }} dipilih</span>
        </div>
        <div class="class-picker-options">
          <label
            v-for="item in group.items"
            :key="item.id"
            class="class-picker-option"
            :class="{ selected: isSelected(item.id) }"
          >
            <input
              type="checkbox"
              :checked="isSelected(item.id)"
              :disabled="disabled"
              @change="toggle(item.id, ($event.target as HTMLInputElement).checked)"
            />
            <span class="class-picker-option-label">{{ classOptionLabel(item) }}</span>
            <span v-if="badgeFor(item.id) === 'self'" class="class-picker-badge is-self">Dipilih sendiri</span>
            <span v-else-if="badgeFor(item.id) === 'admin'" class="class-picker-badge is-admin">Ditetapkan admin</span>
          </label>
        </div>
      </section>
      <p v-if="options.length === 0" class="class-picker-empty">{{ emptyOptionsText }}</p>
      <p v-else-if="groups.length === 0" class="class-picker-empty">Tidak ada kelas yang cocok dengan pencarian “{{ query }}”.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import {
  classOptionLabel,
  groupFilteredClasses,
  groupSelectionState,
  toggleSelectedIds,
  type ClassPickerGroup,
  type ClassPickerOption,
} from '@/lib/class-picker';

const props = withDefaults(defineProps<{
  options: ClassPickerOption[];
  modelValue: number[];
  /** Sumber petaan per kelas (dari user_classes.source) untuk lencana baris terpilih. */
  sources?: Record<number, 'admin' | 'self'>;
  /** Bila true, sumber 'admin' ikut dilabeli "Ditetapkan admin"; default hanya 'self' yang dilabeli. */
  showAdminBadge?: boolean;
  disabled?: boolean;
  theme?: 'light' | 'dark';
  ariaLabel?: string;
  searchPlaceholder?: string;
  emptySelectionText?: string;
  emptyOptionsText?: string;
}>(), {
  sources: () => ({}),
  showAdminBadge: false,
  disabled: false,
  theme: 'light',
  ariaLabel: 'Pemilih kelas',
  searchPlaceholder: 'Ketik nama kelas atau tahun ajaran…',
  emptySelectionText: 'Belum ada kelas dipilih. Centang kelas di bawah untuk memilih.',
  emptyOptionsText: 'Belum ada kelas master.',
});

const emit = defineEmits<{ 'update:modelValue': [ids: number[]] }>();

const query = ref('');
const searchId = useId();

const groups = computed(() => groupFilteredClasses(props.options, query.value));

const selectedOptions = computed<ClassPickerOption[]>(() => {
  const selected = new Set(props.modelValue);
  const known = groupFilteredClasses(props.options, '')
    .flatMap((group) => group.items)
    .filter((item) => selected.has(item.id));
  const knownIds = new Set(known.map((item) => item.id));
  const unknown = props.modelValue
    .filter((id) => !knownIds.has(id))
    .map<ClassPickerOption>((id) => ({ id, label: `Kelas #${id}`, academic_year: '' }));
  return [...known, ...unknown];
});

function isSelected(classId: number) {
  return props.modelValue.includes(classId);
}

function badgeFor(classId: number): 'admin' | 'self' | null {
  const source = props.sources[classId];
  if (source === 'self') return 'self';
  if (source === 'admin' && props.showAdminBadge) return 'admin';
  return null;
}

function groupState(group: ClassPickerGroup) {
  return groupSelectionState(group.items, props.modelValue);
}

function groupSelectedCount(group: ClassPickerGroup) {
  return group.items.filter((item) => props.modelValue.includes(item.id)).length;
}

function toggle(classId: number, select: boolean) {
  emit('update:modelValue', toggleSelectedIds(props.modelValue, [classId], select));
}

function toggleGroup(group: ClassPickerGroup, select: boolean) {
  emit('update:modelValue', toggleSelectedIds(props.modelValue, group.items.map((item) => item.id), select));
}
</script>

<style scoped>
.class-picker {
  --cp-border: #d9e5f2;
  --cp-surface: #f8fbff;
  --cp-text: #243f64;
  --cp-label: #43648d;
  --cp-muted: #7890ac;
  --cp-accent: #246bc5;
  --cp-chip-bg: #eaf3ff;
  --cp-chip-text: #1b63b3;
  --cp-badge-self-bg: #fff2c9;
  --cp-badge-self-text: #765214;
  --cp-badge-admin-bg: #e0e9ff;
  --cp-badge-admin-text: #2c4390;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.class-picker-selected { display: flex; flex-direction: column; gap: 7px; }
.class-picker-count { margin: 0; color: var(--cp-muted); font-size: .68rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.class-picker-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.class-picker-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 5px 4px 10px; border-radius: 999px; color: var(--cp-chip-text); background: var(--cp-chip-bg); font-size: .72rem; font-weight: 700; }
.class-picker-chip-remove { display: grid; width: 18px; height: 18px; place-items: center; border: 0; border-radius: 50%; color: inherit; background: transparent; font-size: .85rem; line-height: 1; cursor: pointer; }
.class-picker-chip-remove:hover:not(:disabled) { background: rgba(127, 148, 178, .25); }
.class-picker-chip-remove:disabled { opacity: .5; cursor: not-allowed; }
.class-picker-empty-selection, .class-picker-empty { margin: 0; color: var(--cp-muted); font-size: .72rem; font-weight: 400; line-height: 1.45; }
.class-picker-search-label { display: block; margin-bottom: 5px; color: var(--cp-muted); font-size: .68rem; font-weight: 700; }
.class-picker-search-input { width: 100%; border: 1px solid var(--cp-border); border-radius: 9px; padding: 9px 11px; color: var(--cp-text); background: var(--cp-surface); font: inherit; font-size: .78rem; }
.class-picker-groups { display: flex; max-height: 300px; flex-direction: column; gap: 12px; overflow-y: auto; padding: 11px 12px; border: 1px solid var(--cp-border); border-radius: 9px; background: var(--cp-surface); }
.class-picker-groups .class-picker-empty { padding: 2px 0; }
.class-picker-group-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.class-picker-group-toggle { display: flex; align-items: center; gap: 8px; color: var(--cp-text); font-size: .74rem; font-weight: 800; cursor: pointer; }
.class-picker-group-toggle input { width: 15px; height: 15px; margin: 0; accent-color: var(--cp-accent); cursor: pointer; }
.class-picker-group-count { color: var(--cp-muted); font-size: .66rem; font-weight: 700; white-space: nowrap; }
.class-picker-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 14px; }
.class-picker-option { display: flex; align-items: center; gap: 8px; min-height: 30px; padding: 3px 6px; border-radius: 7px; color: var(--cp-label); font-size: .78rem; font-weight: 500; cursor: pointer; }
.class-picker-option:hover { background: rgba(127, 148, 178, .12); }
.class-picker-option input { flex: 0 0 auto; width: 15px; height: 15px; margin: 0; accent-color: var(--cp-accent); cursor: pointer; }
.class-picker-option-label { min-width: 0; overflow-wrap: anywhere; }
.class-picker-badge { flex: 0 0 auto; border-radius: 999px; padding: 3px 8px; font-size: .62rem; font-weight: 700; white-space: nowrap; }
.class-picker-badge.is-self { color: var(--cp-badge-self-text); background: var(--cp-badge-self-bg); }
.class-picker-badge.is-admin { color: var(--cp-badge-admin-text); background: var(--cp-badge-admin-bg); }
.class-picker input:focus-visible, .class-picker button:focus-visible { outline: 2px solid var(--cp-accent); outline-offset: 2px; }
@media (max-width: 640px) { .class-picker-options { grid-template-columns: 1fr; } }
</style>
