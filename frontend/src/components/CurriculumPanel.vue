<template>
  <section class="curriculum-panel panel">
    <div class="curriculum-heading">
      <div>
        <h2>Kurikulum</h2>
        <p>Atur pilihan kelas, jenis asesmen, dan mata pelajaran pada halaman peserta.</p>
      </div>
      <button class="secondary-btn" type="button" :disabled="loading" @click="loadData">Muat ulang</button>
    </div>

    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-text">{{ successMessage }}</p>
    <div v-if="loading" class="curriculum-loading">Memuat kurikulum...</div>

    <div v-else class="curriculum-grid">
      <section class="curriculum-group">
        <h3>Kelas</h3>
        <form class="curriculum-form" @submit.prevent="saveClass">
          <input v-model.trim="classForm.slug" placeholder="Slug, contoh: kelas-12" required />
          <input v-model.trim="classForm.label" placeholder="Nama kelas" required />
          <input v-model.number="classForm.display_order" type="number" min="1" placeholder="Urutan" required />
          <div class="form-actions">
            <button class="primary-btn" type="submit">{{ editingClassId ? 'Perbarui' : 'Tambah' }}</button>
            <button v-if="editingClassId" class="secondary-btn" type="button" @click="resetClass">Batal</button>
          </div>
        </form>
        <div class="curriculum-items">
          <div v-for="item in curriculum.classes" :key="item.id" class="curriculum-item">
            <div><strong>{{ item.label }}</strong><small>{{ item.slug }}</small></div>
            <div class="item-actions"><button type="button" @click="editClass(item)">Edit</button><button type="button" class="delete-action" @click="removeClass(item.id)">Hapus</button></div>
          </div>
        </div>
      </section>

      <section class="curriculum-group">
        <h3>Jenis Asesmen</h3>
        <form class="curriculum-form" @submit.prevent="saveAssessmentType">
          <input v-model.trim="typeForm.slug" placeholder="Slug, contoh: asesmen-ruas" required />
          <input v-model.trim="typeForm.label" placeholder="Nama jenis asesmen" required />
          <input v-model.number="typeForm.display_order" type="number" min="1" placeholder="Urutan" required />
          <div class="form-actions">
            <button class="primary-btn" type="submit">{{ editingTypeId ? 'Perbarui' : 'Tambah' }}</button>
            <button v-if="editingTypeId" class="secondary-btn" type="button" @click="resetType">Batal</button>
          </div>
        </form>
        <div class="curriculum-items">
          <div v-for="item in curriculum.assessment_types" :key="item.id" class="curriculum-item">
            <div><strong>{{ item.label }}</strong><small>{{ item.slug }}</small></div>
            <div class="item-actions"><button type="button" @click="editType(item)">Edit</button><button type="button" class="delete-action" @click="removeType(item.id)">Hapus</button></div>
          </div>
        </div>
      </section>

      <section class="curriculum-group subject-group">
        <h3>Mata Pelajaran</h3>
        <form class="curriculum-form" @submit.prevent="saveSubject">
          <input v-model.trim="subjectForm.slug" placeholder="Slug, contoh: matematika" required />
          <input v-model.trim="subjectForm.label" placeholder="Nama mata pelajaran" required />
          <input v-model.number="subjectForm.display_order" type="number" min="1" placeholder="Urutan" required />
          <select v-model="subjectForm.class_id" aria-label="Kelas mata pelajaran">
            <option value="">Semua kelas</option>
            <option v-for="item in curriculum.classes" :key="item.id" :value="String(item.id)">{{ item.label }}</option>
          </select>
          <select v-model="subjectForm.assessment_type_id" aria-label="Jenis asesmen mata pelajaran">
            <option value="">Semua jenis asesmen</option>
            <option v-for="item in curriculum.assessment_types" :key="item.id" :value="String(item.id)">{{ item.label }}</option>
          </select>
          <div class="form-actions">
            <button class="primary-btn" type="submit">{{ editingSubjectId ? 'Perbarui' : 'Tambah' }}</button>
            <button v-if="editingSubjectId" class="secondary-btn" type="button" @click="resetSubject">Batal</button>
          </div>
        </form>
        <div class="curriculum-items">
          <div v-for="item in curriculum.subjects" :key="item.id" class="curriculum-item">
            <div><strong>{{ item.label }}</strong><small>{{ item.slug }} · {{ scopeLabel(item) }}</small></div>
            <div class="item-actions"><button type="button" @click="editSubject(item)">Edit</button><button type="button" class="delete-action" @click="removeSubject(item.id)">Hapus</button></div>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import {
  createAdminAssessmentType, createAdminClass, createAdminSubject,
  deleteAdminAssessmentType, deleteAdminClass, deleteAdminSubject,
  fetchAdminCurriculum, updateAdminAssessmentType, updateAdminClass, updateAdminSubject,
  type CurriculumItemInput, type CurriculumSubjectInput,
} from '@/api/client';
import type { AssessmentType, CurriculumClass, CurriculumData, Subject } from '@/types';

const curriculum = ref<CurriculumData>({ classes: [], assessment_types: [], subjects: [] });
const loading = ref(true);
const errorMessage = ref('');
const successMessage = ref('');
const editingClassId = ref<number | null>(null);
const editingTypeId = ref<number | null>(null);
const editingSubjectId = ref<number | null>(null);
const classForm = reactive<CurriculumItemInput>({ slug: '', label: '', display_order: 1 });
const typeForm = reactive<CurriculumItemInput>({ slug: '', label: '', display_order: 1 });
const subjectForm = reactive<CurriculumSubjectInput>({ slug: '', label: '', display_order: 1, class_id: null, assessment_type_id: null });

function showError(error: unknown) { errorMessage.value = error instanceof Error ? error.message : 'Gagal memproses kurikulum.'; successMessage.value = ''; }
function showSuccess(message: string) { successMessage.value = message; errorMessage.value = ''; }
async function loadData() { loading.value = true; try { curriculum.value = await fetchAdminCurriculum(); } catch (error) { showError(error); } finally { loading.value = false; } }
function clearForm(form: CurriculumItemInput) { form.slug = ''; form.label = ''; form.display_order = 1; }
function resetClass() { editingClassId.value = null; clearForm(classForm); }
function resetType() { editingTypeId.value = null; clearForm(typeForm); }
function resetSubject() { editingSubjectId.value = null; subjectForm.slug = ''; subjectForm.label = ''; subjectForm.display_order = 1; subjectForm.class_id = null; subjectForm.assessment_type_id = null; }
function editClass(item: CurriculumClass) { editingClassId.value = item.id; Object.assign(classForm, item); }
function editType(item: AssessmentType) { editingTypeId.value = item.id; Object.assign(typeForm, item); }
function editSubject(item: Subject) { editingSubjectId.value = item.id; Object.assign(subjectForm, { slug: item.slug, label: item.label, display_order: item.display_order, class_id: item.class_id ?? null, assessment_type_id: item.assessment_type_id ?? null }); }

async function saveClass() { try { editingClassId.value ? await updateAdminClass(editingClassId.value, classForm) : await createAdminClass(classForm); resetClass(); await loadData(); showSuccess('Kelas berhasil disimpan.'); } catch (error) { showError(error); } }
async function saveAssessmentType() { try { editingTypeId.value ? await updateAdminAssessmentType(editingTypeId.value, typeForm) : await createAdminAssessmentType(typeForm); resetType(); await loadData(); showSuccess('Jenis asesmen berhasil disimpan.'); } catch (error) { showError(error); } }
async function saveSubject() { const input = { ...subjectForm, class_id: subjectForm.class_id ? Number(subjectForm.class_id) : null, assessment_type_id: subjectForm.assessment_type_id ? Number(subjectForm.assessment_type_id) : null }; try { editingSubjectId.value ? await updateAdminSubject(editingSubjectId.value, input) : await createAdminSubject(input); resetSubject(); await loadData(); showSuccess('Mata pelajaran berhasil disimpan.'); } catch (error) { showError(error); } }
async function removeClass(id: number) { if (!window.confirm('Hapus kelas ini?')) return; try { await deleteAdminClass(id); await loadData(); showSuccess('Kelas berhasil dihapus.'); } catch (error) { showError(error); } }
async function removeType(id: number) { if (!window.confirm('Hapus jenis asesmen ini?')) return; try { await deleteAdminAssessmentType(id); await loadData(); showSuccess('Jenis asesmen berhasil dihapus.'); } catch (error) { showError(error); } }
async function removeSubject(id: number) { if (!window.confirm('Hapus mata pelajaran ini?')) return; try { await deleteAdminSubject(id); await loadData(); showSuccess('Mata pelajaran berhasil dihapus.'); } catch (error) { showError(error); } }
function scopeLabel(subject: Subject) { const classLabel = curriculum.value.classes.find((item) => item.id === subject.class_id)?.label ?? 'Semua kelas'; const typeLabel = curriculum.value.assessment_types.find((item) => item.id === subject.assessment_type_id)?.label ?? 'Semua jenis'; return `${classLabel} · ${typeLabel}`; }
onMounted(loadData);
</script>

<style scoped>
.curriculum-panel { display: flex; flex-direction: column; gap: 16px; padding: 22px; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; box-shadow: 0 10px 28px rgba(30, 64, 175, .07); }
.primary-btn, .secondary-btn { border: 0; border-radius: 8px; padding: 9px 14px; font: inherit; font-size: .8rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
.primary-btn { color: #fff; background: #1e40af; }
.secondary-btn { color: #1e40af; background: #e8edf5; }
.primary-btn:disabled, .secondary-btn:disabled { opacity: .6; cursor: default; }
.error-text { color: #c53030; }
.success-text { color: #2f855a; }
.curriculum-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.curriculum-heading h2 { color: #1e40af; font-size: 1.15rem; }
.curriculum-heading p { margin-top: 4px; color: #667788; font-size: .85rem; }
.curriculum-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.curriculum-group { min-width: 0; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f9fbfd; }
.subject-group { grid-column: 1 / -1; }
.curriculum-group h3 { margin-bottom: 12px; color: #233d61; font-size: 1rem; }
.curriculum-form { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.5fr) 80px; gap: 8px; }
.subject-group .curriculum-form { grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) 80px minmax(0, 1fr) minmax(0, 1fr) auto; }
.curriculum-form input, .curriculum-form select { min-width: 0; width: 100%; padding: 9px 10px; border: 1px solid #d4dde6; border-radius: 8px; background: #fff; color: #334b68; font: inherit; font-size: .82rem; }
.form-actions { display: flex; gap: 6px; }
.form-actions .primary-btn, .form-actions .secondary-btn { padding: 9px 12px; font-size: .78rem; }
.curriculum-items { display: flex; flex-direction: column; gap: 7px; margin-top: 14px; }
.curriculum-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border: 1px solid #e1e8f0; border-radius: 8px; background: #fff; }
.curriculum-item strong, .curriculum-item small { display: block; }
.curriculum-item strong { color: #314c70; font-size: .84rem; }
.curriculum-item small { margin-top: 2px; color: #8292a6; font-size: .7rem; }
.item-actions { display: flex; gap: 8px; flex-shrink: 0; }
.item-actions button { border: 0; color: #1e5ec8; background: transparent; font: inherit; font-size: .74rem; font-weight: 700; cursor: pointer; }
.item-actions .delete-action { color: #c53030; }
.curriculum-loading { color: #778899; }
@media (max-width: 900px) { .curriculum-grid { grid-template-columns: 1fr; } .subject-group { grid-column: auto; } .subject-group .curriculum-form, .curriculum-form { grid-template-columns: 1fr 1fr; } .subject-group .form-actions, .curriculum-form .form-actions { grid-column: 1 / -1; } }
@media (max-width: 520px) { .curriculum-heading { flex-direction: column; } .subject-group .curriculum-form, .curriculum-form { grid-template-columns: 1fr; } .subject-group .form-actions, .curriculum-form .form-actions { grid-column: auto; } .curriculum-item { align-items: flex-start; flex-direction: column; } }
</style>
