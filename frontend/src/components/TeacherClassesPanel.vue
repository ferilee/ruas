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
    <template v-else>
      <p v-if="errorMessage" class="teacher-classes-error">{{ errorMessage }}</p>
      <ClassPicker
        class="teacher-classes-picker"
        theme="light"
        :options="classes"
        :model-value="selectedIds"
        :sources="sources"
        show-admin-badge
        :disabled="saving"
        aria-label="Kelas saya"
        empty-selection-text="Anda belum terpetakan ke kelas mana pun. Centang kelas di bawah ini untuk menambahkannya."
        empty-options-text="Belum ada kelas master yang tersedia."
        @update:model-value="applySelection"
      />
      <p v-if="classes.length && selectedIds.length === classes.length" class="teacher-classes-note">Semua kelas master sudah masuk daftar Anda.</p>
      <p class="teacher-classes-note">Kelas master dibuat oleh Admin sebagai satu sumber kebenaran. Kelas yang Anda pilih sendiri langsung aktif, tercatat, dan dapat dicabut Admin; kelas yang belum tersedia dapat diusulkan kepada Admin.</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { addMyClass, fetchMyClasses, removeMyClass } from '@/api/client';
import ClassPicker from '@/components/ClassPicker.vue';
import type { MyClassOption, MyClassesData, UserClassMapping } from '@/types';

const classes = ref<MyClassOption[]>([]);
const mappings = ref<UserClassMapping[]>([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');

const selectedIds = computed(() => mappings.value.map((mapping) => mapping.class_id));
const sources = computed<Record<number, 'admin' | 'self'>>(() => Object.fromEntries(mappings.value.map((mapping) => [mapping.class_id, mapping.source])));

function applyData(data: MyClassesData) {
  classes.value = data.classes;
  mappings.value = data.mappings;
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

/**
 * Pemilih kelas bersifat langsung: setiap perubahan centang diterjemahkan
 * menjadi panggilan tambah/lepas kelas yang sama seperti tombol lama,
 * lalu keadaan panel disegarkan dari respons API terakhir.
 */
async function applySelection(nextIds: number[]) {
  const currentIds = selectedIds.value;
  const added = nextIds.filter((id) => !currentIds.includes(id));
  const removed = currentIds.filter((id) => !nextIds.includes(id));
  if (added.length === 0 && removed.length === 0) return;
  saving.value = true;
  errorMessage.value = '';
  try {
    let data: MyClassesData | null = null;
    for (const classId of removed) data = await removeMyClass(classId);
    for (const classId of added) data = await addMyClass(classId);
    if (data) applyData(data);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memperbarui kelas saya.';
    try {
      applyData(await fetchMyClasses());
    } catch {
      // Pesan kesalahan utama dipertahankan; keadaan lama tetap tampil.
    }
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.teacher-classes-panel { margin: 13px clamp(20px, 5vw, 58px) 42px; padding: 20px; border: 1px solid #dce7f4; border-radius: 3px; color: #1d3557; background: #fff; box-shadow: 0 10px 24px rgba(31, 74, 126, .06); }
.teacher-classes-heading { display: flex; align-items: center; gap: 14px; }
.teacher-classes-heading h3 { color: #172b4d; font-size: 1rem; text-transform: uppercase; }
.teacher-classes-heading p { margin-top: 5px; color: #66788e; font-size: .78rem; line-height: 1.45; }
.teacher-classes-icon { display: grid; width: 40px; height: 40px; flex: 0 0 auto; place-items: center; border: 1px solid currentColor; font-size: 1.25rem; font-weight: 700; }
.teacher-classes-icon.tone-green { color: #2c8c67; background: #e3f7ed; }
.teacher-classes-picker { margin-top: 16px; }
.teacher-classes-note { margin-top: 14px; color: #66788e; font-size: .76rem; line-height: 1.55; }
.teacher-classes-error { margin-top: 14px; color: #c53030; font-size: .78rem; }
</style>
