<template>
  <section class="teacher-classes-panel" aria-labelledby="teacher-classes-title">
    <div class="teacher-classes-heading">
      <span class="teacher-classes-icon tone-green" aria-hidden="true">▦</span>
      <div>
        <h3 id="teacher-classes-title">Kelas saya</h3>
        <p>Kelas tempat Anda terpetakan. Ruang kerja, topik, jadwal, laporan, dan siswa Anda mengikuti daftar ini.</p>
      </div>
    </div>

    <p v-if="loading" class="teacher-classes-note">Memuat kelas...</p>
    <p v-else-if="errorMessage" class="teacher-classes-error">{{ errorMessage }}</p>
    <template v-else>
      <ul v-if="mappings.length" class="teacher-classes-list">
        <li v-for="mapping in mappings" :key="mapping.class_id" class="teacher-classes-item">
          <span class="teacher-classes-item-label">{{ classLabel(mapping.class_id) }}</span>
          <span :class="['teacher-classes-badge', mapping.source === 'self' ? 'is-self' : 'is-admin']">{{ mapping.source === 'self' ? 'Dipilih sendiri' : 'Ditetapkan admin' }}</span>
          <button class="teacher-classes-remove" type="button" :disabled="saving" @click="removeClass(mapping.class_id)">Lepas</button>
        </li>
      </ul>
      <p v-else class="teacher-classes-note">Anda belum terpetakan ke kelas mana pun. Tambahkan kelas pertama Anda di bawah ini.</p>

      <div v-if="availableClasses.length" class="teacher-classes-add">
        <RuasSelect v-model="selectedClassId" :options="availableOptions" placeholder="Pilih kelas master" aria-label="Kelas master yang akan ditambahkan" />
        <button class="teacher-classes-add-btn" type="button" :disabled="saving || selectedClassId === null || selectedClassId === undefined" @click="addClass">Tambah kelas</button>
      </div>
      <p v-else class="teacher-classes-note">Semua kelas master sudah masuk daftar Anda.</p>
      <p class="teacher-classes-note">Kelas master dibuat oleh Admin sebagai satu sumber kebenaran. Kelas yang Anda pilih sendiri langsung aktif, tercatat, dan dapat dicabut Admin; kelas yang belum tersedia dapat diusulkan kepada Admin.</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { addMyClass, fetchMyClasses, removeMyClass } from '@/api/client';
import RuasSelect from '@/components/RuasSelect.vue';
import type { MyClassOption, UserClassMapping } from '@/types';

const classes = ref<MyClassOption[]>([]);
const mappings = ref<UserClassMapping[]>([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const selectedClassId = ref<number | null | undefined>(undefined);

const availableClasses = computed(() => classes.value.filter((item) => !mappings.value.some((mapping) => mapping.class_id === item.id)));
const availableOptions = computed(() => availableClasses.value.map((item) => ({ value: item.id, label: `${item.label} · ${item.academic_year}` })));

function classLabel(classId: number) {
  const item = classes.value.find((entry) => entry.id === classId);
  return item ? `${item.label} · ${item.academic_year}` : `Kelas #${classId}`;
}

function applyData(data: { classes: MyClassOption[]; mappings: UserClassMapping[] }) {
  classes.value = data.classes;
  mappings.value = data.mappings;
  selectedClassId.value = undefined;
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  try {
    applyData(await fetchMyClasses());
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat kelas saya.';
  } finally {
    loading.value = false;
  }
}

async function addClass() {
  if (selectedClassId.value === null || selectedClassId.value === undefined) return;
  saving.value = true;
  errorMessage.value = '';
  try {
    applyData(await addMyClass(selectedClassId.value));
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal menambahkan kelas.';
  } finally {
    saving.value = false;
  }
}

async function removeClass(classId: number) {
  saving.value = true;
  errorMessage.value = '';
  try {
    applyData(await removeMyClass(classId));
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal melepas kelas.';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.teacher-classes-panel { margin: 13px clamp(20px, 5vw, 58px) 42px; padding: 20px; border: 1px solid #3d3c43; border-radius: 3px; color: #f6f2eb; background: #202023; }
.teacher-classes-heading { display: flex; align-items: center; gap: 14px; }
.teacher-classes-heading h3 { color: #f8f3ed; font-size: 1rem; text-transform: uppercase; }
.teacher-classes-heading p { margin-top: 5px; color: #aaa6b0; font-size: .78rem; line-height: 1.45; }
.teacher-classes-icon { display: grid; width: 40px; height: 40px; flex: 0 0 auto; place-items: center; border: 1px solid currentColor; font-size: 1.25rem; font-weight: 700; }
.teacher-classes-icon.tone-green { color: #70eee8; background: #123f43; }
.teacher-classes-list { display: flex; flex-direction: column; gap: 8px; margin: 16px 0 0; padding: 0; list-style: none; }
.teacher-classes-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #3d3c43; background: #25252a; }
.teacher-classes-item-label { flex: 1; min-width: 0; color: #e0dce4; font-size: .8rem; font-weight: 700; }
.teacher-classes-badge { border-radius: 999px; padding: 4px 9px; font-size: .65rem; font-weight: 700; white-space: nowrap; }
.teacher-classes-badge.is-admin { color: #aab8ff; background: #202d5b; }
.teacher-classes-badge.is-self { color: #765214; background: #fff2c9; }
.teacher-classes-remove { padding: 7px 10px; border: 1px solid #4b4a52; border-radius: 8px; color: #d5d1d8; background: #25252a; font: inherit; font-size: .68rem; font-weight: 700; cursor: pointer; }
.teacher-classes-remove:hover:not(:disabled) { border-color: #9b8fd0; color: #fff; background: #393542; }
.teacher-classes-add { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; margin-top: 16px; }
.teacher-classes-add-btn { padding: 10px 14px; border: 1px solid #3d3c43; color: #fff; background: #2c78d2; font: inherit; font-size: .72rem; font-weight: 800; cursor: pointer; white-space: nowrap; }
.teacher-classes-add-btn:disabled { opacity: .55; cursor: not-allowed; }
.teacher-classes-note { margin-top: 14px; color: #a49fae; font-size: .76rem; line-height: 1.55; }
.teacher-classes-error { margin-top: 14px; color: #ff9d9d; font-size: .78rem; }
@media (max-width: 720px) { .teacher-classes-add { grid-template-columns: 1fr; } }
</style>
