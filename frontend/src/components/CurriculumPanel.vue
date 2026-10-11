<template>
  <section class="curriculum-panel panel">
    <ConfirmDialog :open="confirmOpen" :title="confirmTitle" :message="confirmMessage" confirm-label="Hapus" @confirm="runConfirmation" @cancel="closeConfirmation" />
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

    <div v-else>
      <div class="mobile-curriculum-tabs" role="tablist" aria-label="Kategori kurikulum">
        <button v-for="tab in mobileTabs" :key="tab.value" type="button" role="tab" :aria-selected="mobileTab === tab.value" :class="['mobile-curriculum-tab', { active: mobileTab === tab.value }]" @click="mobileTab = tab.value">{{ tab.label }}</button>
      </div>

      <div class="curriculum-grid">
      <section :class="['curriculum-group', 'class-group', { 'mobile-active': mobileTab === 'classes', 'mobile-form-open': mobileFormOpen && mobileTab === 'classes' }]">
        <div class="curriculum-group-heading"><h3>Kelas</h3><button class="mobile-add-btn" type="button" @click="openClassForm">＋ Tambah</button></div>
        <form class="curriculum-form class-form" @submit.prevent="saveClass">
          <div class="mobile-form-heading"><strong>{{ editingClassId ? 'Edit kelas' : 'Tambah kelas' }}</strong><button type="button" aria-label="Tutup form kelas" @click="closeMobileForm">×</button></div>
          <label><span>Kode kelas</span><input v-model.trim="classForm.slug" placeholder="Contoh: 11-tkj-a" required /></label>
          <label><span>Nama kelas</span><input v-model.trim="classForm.label" placeholder="Contoh: Kelas 11 TKJ A" required /></label>
          <label><span>Tingkat</span><input v-model.number="classForm.grade" type="number" min="1" max="12" placeholder="11" required /></label>
          <label><span>Program keahlian</span><input v-model.trim="classForm.program" placeholder="Contoh: TKJ" required /></label>
          <label><span>Rombel</span><input v-model.trim="classForm.section" placeholder="Contoh: A (opsional)" /></label>
          <label><span>Tahun ajaran</span><input v-model.trim="classForm.academic_year" placeholder="Contoh: 2026/2027" required /></label>
          <label><span>Urutan tampil</span><input v-model.number="classForm.display_order" type="number" min="1" placeholder="1" required /></label>
          <div class="form-actions">
            <button class="primary-btn" type="submit">{{ editingClassId ? 'Perbarui' : 'Tambah' }}</button>
            <button v-if="editingClassId" class="secondary-btn" type="button" @click="resetClass">Batal</button>
          </div>
        </form>
        <div class="curriculum-items">
          <div v-for="item in curriculum.classes" :key="item.id" class="curriculum-item">
            <div><strong>{{ item.label }}</strong><small>{{ item.slug }} · Tingkat {{ item.grade }} · {{ item.program }}{{ item.section ? ` ${item.section}` : '' }} · {{ item.academic_year }}</small></div>
            <div class="item-actions"><button type="button" @click="editClass(item)">Edit</button><button type="button" class="delete-action" @click="removeClass(item.id)">Hapus</button></div>
          </div>
        </div>
      </section>

      <section :class="['curriculum-group', { 'mobile-active': mobileTab === 'types', 'mobile-form-open': mobileFormOpen && mobileTab === 'types' }]">
        <div class="curriculum-group-heading"><h3>Jenis Asesmen</h3><button class="mobile-add-btn" type="button" @click="openTypeForm">＋ Tambah</button></div>
        <form class="curriculum-form" @submit.prevent="saveAssessmentType">
          <div class="mobile-form-heading"><strong>{{ editingTypeId ? 'Edit jenis asesmen' : 'Tambah jenis asesmen' }}</strong><button type="button" aria-label="Tutup form jenis asesmen" @click="closeMobileForm">×</button></div>
          <label><span>Slug</span><input v-model.trim="typeForm.slug" placeholder="Contoh: asesmen-ruas" required /></label>
          <label><span>Nama jenis asesmen</span><input v-model.trim="typeForm.label" placeholder="Contoh: Asesmen RUAS" required /></label>
          <label><span>Urutan tampil</span><input v-model.number="typeForm.display_order" type="number" min="1" placeholder="1" required /></label>
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

      <section :class="['curriculum-group', 'subject-group', { 'mobile-active': mobileTab === 'subjects', 'mobile-form-open': mobileFormOpen && mobileTab === 'subjects' }]">
        <div class="curriculum-group-heading"><h3>Mata Pelajaran</h3><button class="mobile-add-btn" type="button" @click="openSubjectForm">＋ Tambah</button></div>
        <form class="curriculum-form" @submit.prevent="saveSubject">
          <div class="mobile-form-heading"><strong>{{ editingSubjectId ? 'Edit mata pelajaran' : 'Tambah mata pelajaran' }}</strong><button type="button" aria-label="Tutup form mata pelajaran" @click="closeMobileForm">×</button></div>
          <label><span>Slug</span><input v-model.trim="subjectForm.slug" placeholder="Contoh: matematika" required /></label>
          <label><span>Nama mata pelajaran</span><input v-model.trim="subjectForm.label" placeholder="Contoh: Penalaran Matematika" required /></label>
          <label><span>Urutan tampil</span><input v-model.number="subjectForm.display_order" type="number" min="1" placeholder="1" required /></label>
          <label><span>Jumlah attempts</span><input v-model.number="subjectForm.max_attempts" type="number" min="0" max="100" placeholder="1" title="Jumlah percobaan siswa. Isi 0 untuk tak terbatas." required /><small>0 = tanpa batas</small></label>
          <label><span>Pembahasan siswa</span><RuasSelect v-model="subjectForm.explanation_mode" :options="explanationModeOptions" aria-label="Waktu tampil pembahasan" /></label>
          <label><span>Kelas</span><RuasSelect v-model="subjectForm.class_id" :options="classOptions" aria-label="Kelas mata pelajaran" /></label>
          <label><span>Jenis asesmen</span><RuasSelect v-model="subjectForm.assessment_type_id" :options="assessmentTypeOptions" aria-label="Jenis asesmen mata pelajaran" /></label>
          <div class="form-actions">
            <button class="primary-btn" type="submit">{{ editingSubjectId ? 'Perbarui' : 'Tambah' }}</button>
            <button v-if="editingSubjectId" class="secondary-btn" type="button" @click="resetSubject">Batal</button>
          </div>
        </form>
        <div class="curriculum-items">
          <div v-for="item in curriculum.subjects" :key="item.id" class="curriculum-item">
            <div><strong>{{ item.label }}</strong><small>{{ item.slug }} · {{ scopeLabel(item) }} · {{ attemptsLabel(item.max_attempts) }} · {{ explanationModeLabel(item.explanation_mode) }}</small></div>
            <div class="item-actions"><button type="button" @click="editSubject(item)">Edit</button><button type="button" class="delete-action" @click="removeSubject(item.id)">Hapus</button></div>
          </div>
        </div>
      </section>

      <section :class="['curriculum-group', 'topic-group', { 'mobile-active': mobileTab === 'topics', 'mobile-form-open': mobileFormOpen && mobileTab === 'topics' }]">
        <div class="curriculum-group-heading"><h3>Topik</h3><button class="mobile-add-btn" type="button" @click="openTopicForm">＋ Tambah</button></div>
        <form class="curriculum-form topic-form" @submit.prevent="saveTopic">
          <div class="mobile-form-heading"><strong>{{ editingTopicId ? 'Edit topik' : 'Tambah topik' }}</strong><button type="button" aria-label="Tutup form topik" @click="closeMobileForm">×</button></div>
          <label><span>Mata pelajaran</span><RuasSelect v-model="topicForm.subject_id" :options="subjectOptions" placeholder="Pilih mata pelajaran" aria-label="Mata pelajaran topik" /></label>
          <label><span>Nama topik</span><input v-model.trim="topicForm.label" placeholder="Contoh: Barisan dan Deret" required /></label>
          <label><span>Slug import</span><input v-model.trim="topicForm.slug" placeholder="Contoh: barisan-dan-deret" required /><small>Gunakan slug ini pada field topic_slug JSON.</small></label>
          <label><span>Urutan tampil</span><input v-model.number="topicForm.display_order" type="number" min="1" placeholder="1" required /></label>
          <div class="form-actions">
            <button class="primary-btn" type="submit">{{ editingTopicId ? 'Perbarui' : 'Tambah' }}</button>
            <button v-if="editingTopicId" class="secondary-btn" type="button" @click="resetTopic">Batal</button>
          </div>
        </form>
        <div class="curriculum-items">
          <div v-for="item in topics" :key="item.id" class="curriculum-item">
            <div><strong>{{ item.label }}</strong><small>{{ item.slug }} · {{ item.subject_label }} · {{ item.token_configured ? 'Token aktif' : 'Tanpa token' }}</small></div>
            <div class="item-actions"><button type="button" @click="editTopic(item)">Edit</button><button type="button" class="delete-action" @click="removeTopic(item.id)">Hapus</button></div>
          </div>
          <p v-if="topics.length === 0" class="curriculum-empty">Belum ada topik.</p>
        </div>
      </section>
    </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import RuasSelect from '@/components/RuasSelect.vue';
import {
  createAdminAssessmentType, createAdminClass, createAdminSubject,
  createAdminTopic, deleteAdminTopic, fetchAdminTopics,
  deleteAdminAssessmentType, deleteAdminClass, deleteAdminSubject,
  fetchAdminCurriculum, updateAdminAssessmentType, updateAdminClass, updateAdminSubject, updateAdminTopic,
  type CurriculumClassInput, type CurriculumItemInput, type CurriculumSubjectInput,
} from '@/api/client';
import type { AdminTopic, AdminTopicInput, AssessmentType, CurriculumClass, CurriculumData, Subject } from '@/types';

const curriculum = ref<CurriculumData>({ classes: [], assessment_types: [], subjects: [] });
const loading = ref(true);
const errorMessage = ref('');
const successMessage = ref('');
const editingClassId = ref<number | null>(null);
const editingTypeId = ref<number | null>(null);
const editingSubjectId = ref<number | null>(null);
const editingTopicId = ref<number | null>(null);
const topics = ref<AdminTopic[]>([]);
type MobileCurriculumTab = 'classes' | 'types' | 'subjects' | 'topics';
const mobileTab = ref<MobileCurriculumTab>('subjects');
const mobileFormOpen = ref(false);
const confirmOpen = ref(false);
const confirmTitle = ref('Konfirmasi tindakan');
const confirmMessage = ref('Apakah kamu yakin ingin melanjutkan?');
const pendingConfirmation = ref<(() => Promise<void>) | null>(null);
const mobileTabs: Array<{ value: MobileCurriculumTab; label: string }> = [
  { value: 'classes', label: 'Kelas' },
  { value: 'types', label: 'Jenis Asesmen' },
  { value: 'subjects', label: 'Mata Pelajaran' },
  { value: 'topics', label: 'Topik' },
];
const classForm = reactive<CurriculumClassInput>({ slug: '', label: '', academic_year: '2026/2027', grade: 10, program: '', section: null, display_order: 1 });
const typeForm = reactive<CurriculumItemInput>({ slug: '', label: '', display_order: 1 });
const subjectForm = reactive<CurriculumSubjectInput>({ slug: '', label: '', display_order: 1, max_attempts: 1, explanation_mode: 'hidden', class_id: null, assessment_type_id: null });
const topicForm = reactive<AdminTopicInput>({ subject_id: 0, slug: '', label: '', display_order: 1 });
const explanationModeOptions = [
  { value: 'after_answer', label: 'Setelah menjawab' },
  { value: 'after_exam', label: 'Setelah asesmen selesai' },
  { value: 'hidden', label: 'Jangan tampilkan' },
];
const classOptions = computed(() => [{ value: null, label: 'Semua kelas' }, ...curriculum.value.classes.map((item) => ({ value: item.id, label: `${item.label} · ${item.academic_year}` }))]);
const assessmentTypeOptions = computed(() => [{ value: null, label: 'Semua jenis asesmen' }, ...curriculum.value.assessment_types.map((item) => ({ value: item.id, label: item.label }))]);
const subjectOptions = computed(() => curriculum.value.subjects.map((item) => ({ value: item.id, label: `${item.label} · ${item.slug}` })));

const emit = defineEmits<{ topicsUpdated: [] }>();

function showError(error: unknown) { errorMessage.value = error instanceof Error ? error.message : 'Gagal memproses kurikulum.'; successMessage.value = ''; }
function showSuccess(message: string) { successMessage.value = message; errorMessage.value = ''; }
function clearForm(form: CurriculumItemInput) { form.slug = ''; form.label = ''; form.display_order = 1; }
function resetClass() { editingClassId.value = null; classForm.slug = ''; classForm.label = ''; classForm.academic_year = '2026/2027'; classForm.grade = 10; classForm.program = ''; classForm.section = null; classForm.display_order = 1; mobileFormOpen.value = false; }
function resetType() { editingTypeId.value = null; clearForm(typeForm); mobileFormOpen.value = false; }
function resetSubject() { editingSubjectId.value = null; subjectForm.slug = ''; subjectForm.label = ''; subjectForm.display_order = 1; subjectForm.max_attempts = 1; subjectForm.explanation_mode = 'hidden'; subjectForm.class_id = null; subjectForm.assessment_type_id = null; mobileFormOpen.value = false; }
function resetTopic() { editingTopicId.value = null; topicForm.subject_id = 0; topicForm.slug = ''; topicForm.label = ''; topicForm.display_order = 1; mobileFormOpen.value = false; }
function openClassForm() { resetClass(); mobileTab.value = 'classes'; mobileFormOpen.value = true; }
function openTypeForm() { resetType(); mobileTab.value = 'types'; mobileFormOpen.value = true; }
function openSubjectForm() { resetSubject(); mobileTab.value = 'subjects'; mobileFormOpen.value = true; }
function openTopicForm() { resetTopic(); mobileTab.value = 'topics'; mobileFormOpen.value = true; }
function closeMobileForm() { mobileFormOpen.value = false; }
function askConfirmation(title: string, message: string, action: () => Promise<void>) { confirmTitle.value = title; confirmMessage.value = message; pendingConfirmation.value = action; confirmOpen.value = true; }
function closeConfirmation() { confirmOpen.value = false; pendingConfirmation.value = null; }
async function runConfirmation() { const action = pendingConfirmation.value; closeConfirmation(); if (action) await action(); }
function editClass(item: CurriculumClass) { editingClassId.value = item.id; Object.assign(classForm, item); mobileTab.value = 'classes'; mobileFormOpen.value = true; }
function editType(item: AssessmentType) { editingTypeId.value = item.id; Object.assign(typeForm, item); mobileTab.value = 'types'; mobileFormOpen.value = true; }
function editSubject(item: Subject) { editingSubjectId.value = item.id; Object.assign(subjectForm, { slug: item.slug, label: item.label, display_order: item.display_order, max_attempts: item.max_attempts ?? 1, explanation_mode: item.explanation_mode ?? 'hidden', class_id: item.class_id ?? null, assessment_type_id: item.assessment_type_id ?? null }); mobileTab.value = 'subjects'; mobileFormOpen.value = true; }
function editTopic(item: AdminTopic) { editingTopicId.value = item.id; Object.assign(topicForm, { subject_id: item.subject_id, slug: item.slug, label: item.label, display_order: item.display_order }); mobileTab.value = 'topics'; mobileFormOpen.value = true; }

async function saveClass() {
  try {
    if (editingClassId.value) await updateAdminClass(editingClassId.value, classForm);
    else await createAdminClass(classForm);
    resetClass();
    await loadData();
    showSuccess('Kelas berhasil disimpan.');
  } catch (error) { showError(error); }
}

async function saveAssessmentType() {
  try {
    if (editingTypeId.value) await updateAdminAssessmentType(editingTypeId.value, typeForm);
    else await createAdminAssessmentType(typeForm);
    resetType();
    await loadData();
    showSuccess('Jenis asesmen berhasil disimpan.');
  } catch (error) { showError(error); }
}

async function saveSubject() {
  const input = { ...subjectForm, class_id: subjectForm.class_id ? Number(subjectForm.class_id) : null, assessment_type_id: subjectForm.assessment_type_id ? Number(subjectForm.assessment_type_id) : null };
  try {
    if (editingSubjectId.value) await updateAdminSubject(editingSubjectId.value, input);
    else await createAdminSubject(input);
    resetSubject();
    await loadData();
    showSuccess('Mata pelajaran berhasil disimpan.');
  } catch (error) { showError(error); }
}
async function saveTopic() {
  try {
    if (editingTopicId.value) await updateAdminTopic(editingTopicId.value, topicForm);
    else await createAdminTopic(topicForm);
    resetTopic();
    await loadData();
    emit('topicsUpdated');
    showSuccess('Topik berhasil disimpan.');
  } catch (error) { showError(error); }
}
function removeClass(id: number) { askConfirmation('Hapus kelas?', 'Kelas ini akan dihapus dari struktur asesmen.', async () => { try { await deleteAdminClass(id); await loadData(); showSuccess('Kelas berhasil dihapus.'); } catch (error) { showError(error); } }); }
function removeType(id: number) { askConfirmation('Hapus jenis asesmen?', 'Jenis asesmen ini akan dihapus dari struktur asesmen.', async () => { try { await deleteAdminAssessmentType(id); await loadData(); showSuccess('Jenis asesmen berhasil dihapus.'); } catch (error) { showError(error); } }); }
function removeSubject(id: number) { askConfirmation('Hapus mata pelajaran?', 'Mata pelajaran beserta topik dan soal yang terkait akan dihapus. Tindakan ini tidak dapat dibatalkan.', async () => { try { await deleteAdminSubject(id); await loadData(); showSuccess('Mata pelajaran beserta topik dan soal terkait berhasil dihapus.'); } catch (error) { showError(error); } }); }
function removeTopic(id: number) { askConfirmation('Hapus topik?', 'Topik beserta soal yang terkait akan dihapus jika belum pernah dipakai dalam asesmen.', async () => { try { await deleteAdminTopic(id); await loadData(); emit('topicsUpdated'); showSuccess('Topik dan soal terkait berhasil dihapus.'); } catch (error) { showError(error); } }); }
function scopeLabel(subject: Subject) { const classLabel = curriculum.value.classes.find((item) => item.id === subject.class_id)?.label ?? 'Semua kelas'; const typeLabel = curriculum.value.assessment_types.find((item) => item.id === subject.assessment_type_id)?.label ?? 'Semua jenis'; return `${classLabel} · ${typeLabel}`; }
function attemptsLabel(value: number) { return value === 0 ? 'Attempts tak terbatas' : `${value} attempt${value === 1 ? '' : 's'}`; }
function explanationModeLabel(value: Subject['explanation_mode']) { return { after_answer: 'Pembahasan setelah menjawab', after_exam: 'Pembahasan setelah asesmen', hidden: 'Pembahasan disembunyikan' }[value] ?? 'Pembahasan disembunyikan'; }
async function loadData() {
  loading.value = true;
  try {
    const [curriculumData, topicRows] = await Promise.all([fetchAdminCurriculum(), fetchAdminTopics()]);
    curriculum.value = curriculumData;
    topics.value = topicRows;
  } catch (error) { showError(error); } finally { loading.value = false; }
}
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
.subject-group, .topic-group { grid-column: 1 / -1; }
.curriculum-group-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.curriculum-group h3 { color: #233d61; font-size: 1rem; }
.mobile-curriculum-tabs, .mobile-add-btn, .mobile-form-heading { display: none; }
.curriculum-form { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.5fr) 80px; gap: 8px; }
.class-form { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.class-form .form-actions { grid-column: 4; }
.subject-group .curriculum-form { grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) 80px minmax(145px, 1.1fr) minmax(170px, 1.3fr) minmax(0, 1fr) minmax(0, 1fr) auto; }
.topic-group .curriculum-form { grid-template-columns: minmax(180px, 1.1fr) minmax(180px, 1.2fr) minmax(180px, 1.2fr) 90px auto; }
.curriculum-form > label { display: flex; min-width: 0; flex-direction: column; align-items: stretch; gap: 5px; color: #496482; font-size: .7rem; font-weight: 700; }
.curriculum-form > label small { color: #8292a6; font-size: .66rem; font-weight: 400; }
.curriculum-form input, .curriculum-form select { min-width: 0; width: 100%; padding: 9px 10px; border: 1px solid #d4dde6; border-radius: 8px; background: #fff; color: #334b68; font: inherit; font-size: .82rem; font-weight: 400; }
.form-actions { display: flex; align-self: end; gap: 6px; }
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
@media (max-width: 900px) { .curriculum-grid { grid-template-columns: 1fr; } .subject-group, .topic-group { grid-column: auto; } .subject-group .curriculum-form, .topic-group .curriculum-form, .curriculum-form { grid-template-columns: 1fr 1fr; } .subject-group .form-actions, .topic-group .form-actions, .curriculum-form .form-actions, .class-form .form-actions { grid-column: 1 / -1; } }
@media (max-width: 520px) { .curriculum-heading { flex-direction: column; } .subject-group .curriculum-form, .topic-group .curriculum-form, .curriculum-form { grid-template-columns: 1fr; } .subject-group .form-actions, .topic-group .form-actions, .curriculum-form .form-actions { grid-column: auto; } .curriculum-item { align-items: flex-start; flex-direction: column; } }
@media (max-width: 720px) {
  .mobile-curriculum-tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; margin: 0 0 14px; padding: 5px; border: 1px solid #dce8f4; border-radius: 12px; background: #edf4fb; }
  .mobile-curriculum-tab { padding: 9px 5px; border: 0; border-radius: 8px; color: #6b809d; background: transparent; font: inherit; font-size: .68rem; font-weight: 700; cursor: pointer; }
  .mobile-curriculum-tab.active { color: #fff; background: linear-gradient(110deg, #2378db, #2251b5); box-shadow: 0 5px 12px rgba(35, 101, 199, .18); }
  .curriculum-grid { display: block; }
  .curriculum-group { display: none; padding: 14px; }
  .curriculum-group.mobile-active { display: block; }
  .curriculum-group-heading { margin-bottom: 10px; }
  .mobile-add-btn { display: inline-flex; align-items: center; padding: 7px 10px; border: 0; border-radius: 8px; color: #fff; background: #246bc5; font: inherit; font-size: .7rem; font-weight: 700; cursor: pointer; }
  .curriculum-group:not(.mobile-form-open) .curriculum-form { display: none; }
  .curriculum-group.mobile-form-open { position: fixed; z-index: 45; inset: 0; display: block; overflow-y: auto; padding: 18px 14px 32px; border: 0; border-radius: 0; background: #f7faff; }
  .curriculum-group.mobile-form-open .curriculum-group-heading, .curriculum-group.mobile-form-open .curriculum-items { display: none; }
  .curriculum-group.mobile-form-open .curriculum-form { display: grid; grid-template-columns: 1fr; gap: 14px; padding: 0; }
  .mobile-form-heading { display: flex; grid-column: 1 / -1; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1px solid #dce8f4; color: #1e40af; font-size: 1.05rem; }
  .mobile-form-heading button { width: 30px; height: 30px; border: 0; border-radius: 50%; color: #59708d; background: #e8f0f8; font-size: 1.3rem; line-height: 1; cursor: pointer; }
  .curriculum-group.mobile-form-open .form-actions { align-self: auto; grid-column: auto; }
}
</style>
