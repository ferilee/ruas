<template>
  <section class="curriculum-panel panel">
    <ConfirmDialog :open="confirmOpen" :title="confirmTitle" :message="confirmMessage" confirm-label="Hapus" @confirm="runConfirmation" @cancel="closeConfirmation" />
    <Transition name="toast-slide">
      <div v-if="toastMessage" :key="toastId" class="ruas-toast" role="alert" aria-live="assertive">
        <span class="toast-icon" aria-hidden="true">!</span>
        <span class="toast-copy">{{ toastMessage }}</span>
        <button type="button" class="toast-close" aria-label="Tutup notifikasi" @click="dismissToast">×</button>
        <span class="toast-progress" aria-hidden="true"></span>
      </div>
    </Transition>
    <div v-if="mobileFormOpen" class="curriculum-modal-backdrop" role="presentation" @click.self="closeMobileForm">
      <section class="curriculum-modal" role="dialog" aria-modal="true" :aria-labelledby="`${formModal}-form-title`">
        <div class="curriculum-modal-heading">
          <div><span class="modal-eyebrow">STRUKTUR ASESMEN</span><h2 :id="`${formModal}-form-title`">{{ formModalTitle }}</h2><p>{{ formModalDescription }}</p></div>
          <button type="button" class="modal-close-btn" aria-label="Tutup form" @click="closeMobileForm">×</button>
        </div>
        <form v-if="formModal === 'class'" class="curriculum-form class-form modal-form" @submit.prevent="saveClass">
          <label><span>Kode kelas</span><input v-model.trim="classForm.slug" placeholder="Contoh: 11-tkj-a" required /></label>
          <label><span>Nama kelas</span><input v-model.trim="classForm.label" placeholder="Contoh: Kelas 11 TKJ A" required /></label>
          <label><span>Tingkat</span><input v-model.number="classForm.grade" type="number" min="1" max="12" placeholder="11" required /></label>
          <label><span>Program keahlian</span><input v-model.trim="classForm.program" placeholder="Contoh: TKJ" required /></label>
          <label><span>Rombel</span><input v-model.trim="classForm.section" placeholder="Contoh: A (opsional)" /></label>
          <label><span>Tahun ajaran</span><input v-model.trim="classForm.academic_year" placeholder="Contoh: 2026/2027" required /></label>
          <label><span>Urutan tampil</span><input v-model.number="classForm.display_order" type="number" min="1" placeholder="1" required /></label>
          <div class="form-actions"><button class="primary-btn" type="submit">{{ editingClassId ? 'Perbarui' : 'Tambah' }}</button><button class="secondary-btn" type="button" @click="closeMobileForm">Batal</button></div>
        </form>
        <form v-else-if="formModal === 'type'" class="curriculum-form type-form modal-form" @submit.prevent="saveAssessmentType">
          <label><span>Slug</span><input v-model.trim="typeForm.slug" placeholder="Contoh: asesmen-ruas" required /></label>
          <label><span>Nama jenis asesmen</span><input v-model.trim="typeForm.label" placeholder="Contoh: Asesmen RUAS" required /></label>
          <label><span>Urutan tampil</span><input v-model.number="typeForm.display_order" type="number" min="1" placeholder="1" required /></label>
          <div class="form-actions"><button class="primary-btn" type="submit">{{ editingTypeId ? 'Perbarui' : 'Tambah' }}</button><button class="secondary-btn" type="button" @click="closeMobileForm">Batal</button></div>
        </form>
        <form v-else-if="formModal === 'subject'" class="curriculum-form subject-form modal-form" @submit.prevent="saveSubject">
          <label><span>Slug</span><input v-model.trim="subjectForm.slug" placeholder="Contoh: matematika" required /></label>
          <label><span>Nama mata pelajaran</span><input v-model.trim="subjectForm.label" placeholder="Contoh: Penalaran Matematika" required /></label>
          <label><span>Urutan tampil</span><input v-model.number="subjectForm.display_order" type="number" min="1" placeholder="1" required /></label>
          <label><span>Jumlah attempts</span><input v-model.number="subjectForm.max_attempts" type="number" min="0" max="100" placeholder="1" title="Jumlah percobaan siswa. Isi 0 untuk tak terbatas." required /><small>0 = tanpa batas</small></label>
          <label><span>Durasi ujian (menit)</span><input v-model.number="subjectForm.duration_minutes" type="number" min="0" max="1440" placeholder="0" title="Batas waktu pengerjaan. Isi 0 untuk tanpa batas." required /><small>0 = tanpa batas</small></label>
          <label><span>Minimum waktu pengerjaan (menit)</span><input v-model.number="subjectForm.minimum_duration_minutes" type="number" min="0" :max="subjectForm.duration_minutes || 1440" placeholder="0" title="Siswa baru dapat mengumpulkan setelah waktu ini." required /><small>0 = boleh kumpul kapan saja</small></label>
          <label><span>Pembahasan siswa</span><RuasSelect v-model="subjectForm.explanation_mode" :options="explanationModeOptions" aria-label="Waktu tampil pembahasan" /></label>
          <label class="checkbox-field"><input v-model="subjectForm.show_correct_answer_on_wrong" type="checkbox" /><span>Tampilkan jawaban benar saat siswa salah</span></label>
          <label class="checkbox-field"><input v-model="subjectForm.shuffle_questions" type="checkbox" /><span>Acak urutan soal</span></label>
          <label class="checkbox-field"><input v-model="subjectForm.shuffle_options" type="checkbox" /><span>Acak pilihan jawaban</span></label>
          <label><span>Kelas</span><RuasSelect v-model="subjectForm.class_id" :options="classOptions" aria-label="Kelas mata pelajaran" /></label>
          <label><span>Jenis asesmen</span><RuasSelect v-model="subjectForm.assessment_type_id" :options="assessmentTypeOptions" aria-label="Jenis asesmen mata pelajaran" /></label>
          <div class="form-actions"><button class="primary-btn" type="submit">{{ editingSubjectId ? 'Perbarui' : 'Tambah' }}</button><button class="secondary-btn" type="button" @click="closeMobileForm">Batal</button></div>
        </form>
        <form v-else class="curriculum-form topic-form modal-form" @submit.prevent="saveTopic">
          <label><span>Mata pelajaran</span><RuasSelect v-model="topicForm.subject_id" :options="subjectOptions" placeholder="Pilih mata pelajaran" aria-label="Mata pelajaran topik" /></label>
          <label><span>Nama topik</span><input v-model.trim="topicForm.label" placeholder="Contoh: Barisan dan Deret" required /></label>
          <label><span>Slug import</span><input v-model.trim="topicForm.slug" placeholder="Contoh: barisan-dan-deret" required /><small>Gunakan slug ini pada field topic_slug JSON.</small></label>
          <label><span>Urutan tampil</span><input v-model.number="topicForm.display_order" type="number" min="1" placeholder="1" required /></label>
          <div class="form-actions"><button class="primary-btn" type="submit">{{ editingTopicId ? 'Perbarui' : 'Tambah' }}</button><button class="secondary-btn" type="button" @click="closeMobileForm">Batal</button></div>
        </form>
      </section>
    </div>
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
      <section class="curriculum-filter-panel" aria-label="Filter struktur asesmen">
        <div class="curriculum-filter-heading">
          <div><strong>Filter struktur asesmen</strong><small>Pilih kombinasi untuk melihat bagian kurikulum yang relevan.</small></div>
          <button v-if="hasCurriculumFilter" class="filter-reset-button" type="button" @click="resetCurriculumFilters">Reset</button>
        </div>
        <div class="curriculum-filter-grid">
          <label>Kelas<RuasSelect v-model="selectedClassId" :options="filterClassOptions" aria-label="Filter kelas kurikulum" /></label>
          <label>Jenis asesmen<RuasSelect v-model="selectedAssessmentTypeId" :options="filterAssessmentTypeOptions" aria-label="Filter jenis asesmen kurikulum" /></label>
          <label>Mata pelajaran<RuasSelect v-model="selectedSubjectId" :options="filterSubjectOptions" aria-label="Filter mata pelajaran kurikulum" /></label>
        </div>
        <p class="curriculum-filter-result">Menampilkan {{ visibleClasses.length }} kelas · {{ visibleAssessmentTypes.length }} jenis · {{ visibleSubjects.length }} mata pelajaran</p>
      </section>

      <div class="mobile-curriculum-tabs" role="tablist" aria-label="Kategori kurikulum">
        <button v-for="tab in mobileTabs" :key="tab.value" type="button" role="tab" :aria-selected="mobileTab === tab.value" :class="['mobile-curriculum-tab', { active: mobileTab === tab.value }]" @click="mobileTab = tab.value">{{ tab.label }}</button>
      </div>

      <div class="curriculum-grid">
      <section :class="['curriculum-group', 'class-group', { 'mobile-active': mobileTab === 'classes', 'mobile-form-open': mobileFormOpen && mobileTab === 'classes' }]">
        <div class="curriculum-group-heading"><h3>Kelas</h3><button class="curriculum-add-btn" type="button" @click="openClassForm">＋ Tambah</button></div>
        <div class="curriculum-items">
          <div v-for="item in visibleClasses" :key="item.id" class="curriculum-item">
            <div><strong>{{ item.label }}</strong><small>{{ item.slug }} · Tingkat {{ item.grade }} · {{ item.program }}{{ item.section ? ` ${item.section}` : '' }} · {{ item.academic_year }}</small></div>
            <div class="item-actions"><button type="button" @click="editClass(item)">Edit</button><button type="button" class="delete-action" @click="removeClass(item.id)">Hapus</button></div>
          </div>
        </div>
      </section>

      <section :class="['curriculum-group', { 'mobile-active': mobileTab === 'types', 'mobile-form-open': mobileFormOpen && mobileTab === 'types' }]">
        <div class="curriculum-group-heading"><h3>Jenis Asesmen</h3><button class="curriculum-add-btn" type="button" @click="openTypeForm">＋ Tambah</button></div>
        <div class="curriculum-items">
          <div v-for="item in visibleAssessmentTypes" :key="item.id" class="curriculum-item">
            <div><strong>{{ item.label }}</strong><small>{{ item.slug }}</small></div>
            <div class="item-actions"><button type="button" @click="editType(item)">Edit</button><button type="button" class="delete-action" @click="removeType(item.id)">Hapus</button></div>
          </div>
        </div>
      </section>

      <section :class="['curriculum-group', 'subject-group', { 'mobile-active': mobileTab === 'subjects', 'mobile-form-open': mobileFormOpen && mobileTab === 'subjects' }]">
        <div class="curriculum-group-heading"><h3>Mata Pelajaran</h3><button class="curriculum-add-btn" type="button" @click="openSubjectForm">＋ Tambah</button></div>
        <div class="curriculum-items">
          <div v-for="item in visibleSubjects" :key="item.id" class="curriculum-item">
            <div><strong>{{ item.label }}</strong><small>{{ item.slug }} · {{ scopeLabel(item) }} · {{ attemptsLabel(item.max_attempts) }} · {{ durationLabel(item.duration_minutes) }} · {{ minimumDurationLabel(item.minimum_duration_minutes) }} · {{ explanationModeLabel(item.explanation_mode) }} · {{ shuffleLabel(item) }}</small></div>
            <div class="item-actions"><button type="button" @click="editSubject(item)">Edit</button><button type="button" class="delete-action" @click="removeSubject(item.id)">Hapus</button></div>
          </div>
        </div>
      </section>

      <section :class="['curriculum-group', 'topic-group', { 'mobile-active': mobileTab === 'topics', 'mobile-form-open': mobileFormOpen && mobileTab === 'topics' }]">
        <div class="curriculum-group-heading"><h3>Topik</h3><button class="curriculum-add-btn" type="button" @click="openTopicForm">＋ Tambah</button></div>
        <div class="curriculum-items">
          <div v-for="item in visibleTopics" :key="item.id" class="curriculum-item">
            <div><strong>{{ item.label }}</strong><small>{{ item.slug }} · {{ item.subject_label }} · {{ item.token_configured ? 'Token aktif' : 'Tanpa token' }}</small></div>
            <div class="item-actions"><button type="button" @click="editTopic(item)">Edit</button><button type="button" class="delete-action" @click="removeTopic(item.id)">Hapus</button></div>
          </div>
          <p v-if="visibleTopics.length === 0" class="curriculum-empty">Belum ada topik yang sesuai filter.</p>
        </div>
      </section>
    </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
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
import { ADMIN_REALTIME_EVENT, type AdminRealtimeEvent } from '@/lib/admin-realtime';

const curriculum = ref<CurriculumData>({ classes: [], assessment_types: [], subjects: [] });
const loading = ref(true);
const errorMessage = ref('');
const successMessage = ref('');
const toastMessage = ref('');
const toastId = ref(0);
let toastTimer: ReturnType<typeof setTimeout> | null = null;
const editingClassId = ref<number | null>(null);
const editingTypeId = ref<number | null>(null);
const editingSubjectId = ref<number | null>(null);
const editingTopicId = ref<number | null>(null);
const topics = ref<AdminTopic[]>([]);
type MobileCurriculumTab = 'classes' | 'types' | 'subjects' | 'topics';
type CurriculumFormModal = 'class' | 'type' | 'subject' | 'topic';
const mobileTab = ref<MobileCurriculumTab>('subjects');
const mobileFormOpen = ref(false);
const formModal = ref<CurriculumFormModal>('subject');
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
const subjectForm = reactive<CurriculumSubjectInput>({ slug: '', label: '', display_order: 1, max_attempts: 1, duration_minutes: 0, minimum_duration_minutes: 0, explanation_mode: 'hidden', show_correct_answer_on_wrong: false, shuffle_questions: false, shuffle_options: false, class_id: null, assessment_type_id: null });
const topicForm = reactive<AdminTopicInput>({ subject_id: 0, slug: '', label: '', display_order: 1 });
const explanationModeOptions = [
  { value: 'after_answer', label: 'Setelah menjawab' },
  { value: 'after_exam', label: 'Setelah asesmen selesai' },
  { value: 'hidden', label: 'Jangan tampilkan' },
];
const classOptions = computed(() => [{ value: null, label: 'Semua kelas' }, ...curriculum.value.classes.map((item) => ({ value: item.id, label: `${item.label} · ${item.academic_year}` }))]);
const assessmentTypeOptions = computed(() => [{ value: null, label: 'Semua jenis asesmen' }, ...curriculum.value.assessment_types.map((item) => ({ value: item.id, label: item.label }))]);
const subjectOptions = computed(() => curriculum.value.subjects.map((item) => ({ value: item.id, label: `${item.label} · ${item.slug}` })));
const selectedClassId = ref<number | null>(null);
const selectedAssessmentTypeId = ref<number | null>(null);
const selectedSubjectId = ref<number | null>(null);
const filterClassOptions = computed(() => [{ value: null, label: 'Semua kelas' }, ...curriculum.value.classes.map((item) => ({ value: item.id, label: item.label }))]);
const filterAssessmentTypeOptions = computed(() => [{ value: null, label: 'Semua jenis asesmen' }, ...curriculum.value.assessment_types.map((item) => ({ value: item.id, label: item.label }))]);
const filteredSubjects = computed(() => curriculum.value.subjects.filter((item) => {
  if (selectedClassId.value !== null && item.class_id !== null && item.class_id !== selectedClassId.value) return false;
  if (selectedAssessmentTypeId.value !== null && item.assessment_type_id !== null && item.assessment_type_id !== selectedAssessmentTypeId.value) return false;
  return true;
}));
const filterSubjectOptions = computed(() => [{ value: null, label: 'Semua mata pelajaran' }, ...filteredSubjects.value.map((item) => ({ value: item.id, label: item.label }))]);
const visibleClasses = computed(() => selectedClassId.value === null ? curriculum.value.classes : curriculum.value.classes.filter((item) => item.id === selectedClassId.value));
const visibleAssessmentTypes = computed(() => selectedAssessmentTypeId.value === null ? curriculum.value.assessment_types : curriculum.value.assessment_types.filter((item) => item.id === selectedAssessmentTypeId.value));
const visibleSubjects = computed(() => selectedSubjectId.value === null ? filteredSubjects.value : filteredSubjects.value.filter((item) => item.id === selectedSubjectId.value));
const visibleTopics = computed(() => {
  const subjectIds = new Set(visibleSubjects.value.map((item) => item.id));
  return topics.value.filter((item) => subjectIds.has(item.subject_id));
});
const hasCurriculumFilter = computed(() => selectedClassId.value !== null || selectedAssessmentTypeId.value !== null || selectedSubjectId.value !== null);
const formModalTitle = computed(() => ({
  class: editingClassId.value ? 'Edit kelas' : 'Tambah kelas',
  type: editingTypeId.value ? 'Edit jenis asesmen' : 'Tambah jenis asesmen',
  subject: editingSubjectId.value ? 'Edit mata pelajaran' : 'Tambah mata pelajaran',
  topic: editingTopicId.value ? 'Edit topik' : 'Tambah topik',
}[formModal.value]));
const formModalDescription = computed(() => ({
  class: 'Lengkapi identitas kelas untuk digunakan dalam penugasan peserta.',
  type: 'Buat jenis asesmen yang akan menjadi dasar jadwal dan mata pelajaran.',
  subject: 'Atur mata pelajaran, penugasan, dan perilaku pengerjaan siswa.',
  topic: 'Tambahkan topik yang akan berisi kumpulan soal.',
}[formModal.value]));

const emit = defineEmits<{ topicsUpdated: [] }>();

watch([selectedClassId, selectedAssessmentTypeId], () => {
  if (selectedSubjectId.value !== null && !filteredSubjects.value.some((item) => item.id === selectedSubjectId.value)) selectedSubjectId.value = null;
});
function resetCurriculumFilters() {
  selectedClassId.value = null;
  selectedAssessmentTypeId.value = null;
  selectedSubjectId.value = null;
}

function showError(error: unknown) { errorMessage.value = error instanceof Error ? error.message : 'Gagal memproses kurikulum.'; successMessage.value = ''; }
function showSuccess(message: string) { successMessage.value = message; errorMessage.value = ''; }
function dismissToast() {
  toastMessage.value = '';
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
}
function showToast(message: string) {
  dismissToast();
  toastId.value += 1;
  toastMessage.value = message;
  toastTimer = setTimeout(dismissToast, 4000);
}
function clearForm(form: CurriculumItemInput) { form.slug = ''; form.label = ''; form.display_order = 1; }
function resetClass() { editingClassId.value = null; classForm.slug = ''; classForm.label = ''; classForm.academic_year = '2026/2027'; classForm.grade = 10; classForm.program = ''; classForm.section = null; classForm.display_order = 1; mobileFormOpen.value = false; }
function resetType() { editingTypeId.value = null; clearForm(typeForm); mobileFormOpen.value = false; }
function resetSubject() { editingSubjectId.value = null; subjectForm.slug = ''; subjectForm.label = ''; subjectForm.display_order = 1; subjectForm.max_attempts = 1; subjectForm.duration_minutes = 0; subjectForm.minimum_duration_minutes = 0; subjectForm.explanation_mode = 'hidden'; subjectForm.show_correct_answer_on_wrong = false; subjectForm.shuffle_questions = false; subjectForm.shuffle_options = false; subjectForm.class_id = null; subjectForm.assessment_type_id = null; mobileFormOpen.value = false; }
function resetTopic() { editingTopicId.value = null; topicForm.subject_id = 0; topicForm.slug = ''; topicForm.label = ''; topicForm.display_order = 1; mobileFormOpen.value = false; }
function openClassForm() { resetClass(); mobileTab.value = 'classes'; formModal.value = 'class'; mobileFormOpen.value = true; }
function openTypeForm() { resetType(); mobileTab.value = 'types'; formModal.value = 'type'; mobileFormOpen.value = true; }
function openSubjectForm() { resetSubject(); mobileTab.value = 'subjects'; formModal.value = 'subject'; mobileFormOpen.value = true; }
function openTopicForm() { resetTopic(); mobileTab.value = 'topics'; formModal.value = 'topic'; mobileFormOpen.value = true; }
function closeMobileForm() { mobileFormOpen.value = false; }
function askConfirmation(title: string, message: string, action: () => Promise<void>) { confirmTitle.value = title; confirmMessage.value = message; pendingConfirmation.value = action; confirmOpen.value = true; }
function closeConfirmation() { confirmOpen.value = false; pendingConfirmation.value = null; }
async function runConfirmation() { const action = pendingConfirmation.value; closeConfirmation(); if (action) await action(); }
function editClass(item: CurriculumClass) { editingClassId.value = item.id; Object.assign(classForm, item); mobileTab.value = 'classes'; formModal.value = 'class'; mobileFormOpen.value = true; }
function editType(item: AssessmentType) { editingTypeId.value = item.id; Object.assign(typeForm, item); mobileTab.value = 'types'; formModal.value = 'type'; mobileFormOpen.value = true; }
function editSubject(item: Subject) { editingSubjectId.value = item.id; Object.assign(subjectForm, { slug: item.slug, label: item.label, display_order: item.display_order, max_attempts: item.max_attempts ?? 1, duration_minutes: item.duration_minutes ?? 0, minimum_duration_minutes: item.minimum_duration_minutes ?? 0, explanation_mode: item.explanation_mode ?? 'hidden', show_correct_answer_on_wrong: item.show_correct_answer_on_wrong ?? false, shuffle_questions: item.shuffle_questions ?? false, shuffle_options: item.shuffle_options ?? false, class_id: item.class_id ?? null, assessment_type_id: item.assessment_type_id ?? null }); mobileTab.value = 'subjects'; formModal.value = 'subject'; mobileFormOpen.value = true; }
function editTopic(item: AdminTopic) { editingTopicId.value = item.id; Object.assign(topicForm, { subject_id: item.subject_id, slug: item.slug, label: item.label, display_order: item.display_order }); mobileTab.value = 'topics'; formModal.value = 'topic'; mobileFormOpen.value = true; }

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
function removeTopic(id: number) { askConfirmation('Hapus topik?', 'Topik beserta soal yang terkait akan dihapus jika belum pernah dipakai dalam asesmen.', async () => { try { await deleteAdminTopic(id); await loadData(); emit('topicsUpdated'); showSuccess('Topik dan soal terkait berhasil dihapus.'); } catch (error) { showToast(error instanceof Error ? error.message : 'Topik gagal dihapus.'); } }); }
function scopeLabel(subject: Subject) { const classLabel = curriculum.value.classes.find((item) => item.id === subject.class_id)?.label ?? 'Semua kelas'; const typeLabel = curriculum.value.assessment_types.find((item) => item.id === subject.assessment_type_id)?.label ?? 'Semua jenis'; return `${classLabel} · ${typeLabel}`; }
function attemptsLabel(value: number) { return value === 0 ? 'Attempts tak terbatas' : `${value} attempt${value === 1 ? '' : 's'}`; }
function durationLabel(value: number) { return value === 0 ? 'Tanpa batas waktu' : `${value} menit`; }
function minimumDurationLabel(value: number) { return value > 0 ? `Minimum ${value} menit` : 'Boleh kumpul kapan saja'; }
function explanationModeLabel(value: Subject['explanation_mode']) { return { after_answer: 'Pembahasan setelah menjawab', after_exam: 'Pembahasan setelah asesmen', hidden: 'Pembahasan disembunyikan' }[value] ?? 'Pembahasan disembunyikan'; }
function shuffleLabel(subject: Subject) { const settings = [subject.shuffle_questions ? 'Soal diacak' : '', subject.shuffle_options ? 'Opsi diacak' : '', subject.show_correct_answer_on_wrong ? 'Jawaban salah ditampilkan' : 'Jawaban salah disembunyikan'].filter(Boolean); return settings.join(' · '); }
async function loadData() {
  loading.value = true;
  try {
    const [curriculumData, topicRows] = await Promise.all([fetchAdminCurriculum(), fetchAdminTopics()]);
    curriculum.value = curriculumData;
    topics.value = topicRows;
  } catch (error) { showError(error); } finally { loading.value = false; }
}
function handleRealtime(event: Event) {
  const detail = (event as CustomEvent<AdminRealtimeEvent>).detail;
  if (detail?.resource === 'curriculum' || detail?.resource === 'topics') void loadData();
}
onMounted(loadData);
onMounted(() => window.addEventListener(ADMIN_REALTIME_EVENT, handleRealtime));
onUnmounted(() => { dismissToast(); window.removeEventListener(ADMIN_REALTIME_EVENT, handleRealtime); });
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
.curriculum-filter-panel { padding: 14px 16px; border: 1px solid #d6e5f4; border-radius: 13px; background: linear-gradient(115deg, #f7fbff, #eef6ff); }
.curriculum-filter-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.curriculum-filter-heading strong, .curriculum-filter-heading small { display: block; }.curriculum-filter-heading strong { color: #24558f; font-size: .82rem; }.curriculum-filter-heading small { margin-top: 3px; color: #7890ac; font-size: .7rem; font-weight: 400; }
.curriculum-filter-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }.curriculum-filter-grid label { display: flex; min-width: 0; flex-direction: column; gap: 5px; color: #42628c; font-size: .7rem; font-weight: 700; }.curriculum-filter-grid .ruas-select { width: 100%; }
.filter-reset-button { padding: 6px 10px; border: 1px solid #bfd5ed; border-radius: 8px; color: #246bc5; background: #fff; font: inherit; font-size: .7rem; font-weight: 700; cursor: pointer; }.filter-reset-button:hover { background: #edf6ff; }.curriculum-filter-result { margin-top: 10px; color: #7890ac; font-size: .68rem; }
.curriculum-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.curriculum-group { min-width: 0; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f9fbfd; }
.subject-group, .topic-group { grid-column: 1 / -1; }
.curriculum-group-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.curriculum-group h3 { color: #233d61; font-size: 1rem; }
.curriculum-add-btn { display: inline-flex; align-items: center; padding: 8px 11px; border: 0; border-radius: 9px; color: #fff; background: linear-gradient(110deg, #287bd7, #2251b5); box-shadow: 0 6px 13px rgba(35, 101, 199, .16); font: inherit; font-size: .72rem; font-weight: 800; cursor: pointer; }
.curriculum-add-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 16px rgba(35, 101, 199, .22); }
.mobile-curriculum-tabs, .mobile-add-btn, .mobile-form-heading { display: none; }
.curriculum-form { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.5fr) 80px; gap: 8px; }
.class-form { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.class-form .form-actions { grid-column: 4; }
.subject-group .curriculum-form { grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) 80px minmax(145px, 1.1fr) minmax(170px, 1.3fr) minmax(0, 1fr) minmax(0, 1fr) auto; }
.topic-group .curriculum-form { grid-template-columns: minmax(180px, 1.1fr) minmax(180px, 1.2fr) minmax(180px, 1.2fr) 90px auto; }
.curriculum-form > label { display: flex; min-width: 0; flex-direction: column; align-items: stretch; gap: 5px; color: #496482; font-size: .7rem; font-weight: 700; }
.curriculum-form > label.checkbox-field { flex-direction: row; align-items: center; gap: 8px; padding: 9px 10px; border: 1px solid #dce8f4; border-radius: 9px; color: #496482; background: #f8fbff; }
.checkbox-field input { width: 16px; height: 16px; flex: 0 0 16px; accent-color: #246bc5; }
.checkbox-field span { line-height: 1.35; }
.curriculum-form > label small { color: #8292a6; font-size: .66rem; font-weight: 400; }
.curriculum-form input, .curriculum-form select { min-width: 0; width: 100%; padding: 9px 10px; border: 1px solid #d4dde6; border-radius: 8px; background: #fff; color: #334b68; font: inherit; font-size: .82rem; font-weight: 400; }
.form-actions { display: flex; align-self: end; gap: 6px; }
.form-actions .primary-btn, .form-actions .secondary-btn { padding: 9px 12px; font-size: .78rem; }
.curriculum-modal-backdrop { position: fixed; z-index: 100; inset: 0; display: grid; overflow-y: auto; place-items: center; padding: 22px; background: rgba(21, 43, 77, .38); backdrop-filter: blur(5px); }
.curriculum-modal { width: min(100%, 760px); max-height: min(90vh, 820px); overflow-y: auto; padding: 22px; border: 1px solid rgba(255, 255, 255, .85); border-radius: 22px; background: linear-gradient(145deg, #fff, #f3f8ff); box-shadow: 0 24px 60px rgba(18, 45, 88, .3); }
.curriculum-modal-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 18px; padding-bottom: 15px; border-bottom: 1px solid #dce8f4; }
.curriculum-modal-heading h2 { margin-top: 3px; color: #173d80; font-size: 1.25rem; }
.curriculum-modal-heading p { margin-top: 4px; color: #7188a5; font-size: .78rem; line-height: 1.45; }
.modal-eyebrow { color: #287bd7; font-size: .64rem; font-weight: 800; letter-spacing: .14em; }
.modal-close-btn { display: grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border: 0; border-radius: 50%; color: #55708f; background: #e8f1fb; font-size: 1.35rem; line-height: 1; cursor: pointer; }
.modal-close-btn:hover { color: #174e9e; background: #d8e9fb; }
.curriculum-modal .curriculum-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.curriculum-modal .curriculum-form > label { gap: 6px; font-size: .75rem; }
.curriculum-modal .curriculum-form > label.checkbox-field { min-height: 48px; }
.curriculum-modal .form-actions { grid-column: 1 / -1; justify-content: flex-end; align-self: auto; padding-top: 5px; }
.curriculum-modal .subject-form .form-actions, .curriculum-modal .topic-form .form-actions { grid-column: 1 / -1; }
.curriculum-items { display: flex; flex-direction: column; gap: 7px; margin-top: 14px; }
.curriculum-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border: 1px solid #e1e8f0; border-radius: 8px; background: #fff; }
.curriculum-item strong, .curriculum-item small { display: block; }
.curriculum-item strong { color: #314c70; font-size: .84rem; }
.curriculum-item small { margin-top: 2px; color: #8292a6; font-size: .7rem; }
.item-actions { display: flex; gap: 8px; flex-shrink: 0; }
.item-actions button { border: 0; color: #1e5ec8; background: transparent; font: inherit; font-size: .74rem; font-weight: 700; cursor: pointer; }
.item-actions .delete-action { color: #c53030; }
.curriculum-loading { color: #778899; }
.ruas-toast { position: fixed; z-index: 100; top: 22px; right: 22px; display: flex; max-width: min(440px, calc(100vw - 32px)); align-items: center; gap: 11px; overflow: hidden; padding: 14px 42px 14px 14px; border: 1px solid #ffc7cf; border-radius: 15px; color: #7f1d2d; background: rgba(255, 248, 250, .97); box-shadow: 0 16px 34px rgba(41, 46, 84, .2); font-size: .84rem; font-weight: 700; backdrop-filter: blur(12px); }
.toast-icon { display: grid; width: 24px; height: 24px; flex: 0 0 24px; place-items: center; border-radius: 50%; color: #fff; background: #e34f67; font-weight: 800; }
.toast-copy { line-height: 1.4; }
.toast-close { position: absolute; top: 8px; right: 10px; width: 24px; height: 24px; border: 0; color: #a13a4a; background: transparent; font-size: 1.15rem; line-height: 1; cursor: pointer; }
.toast-progress { position: absolute; right: 0; bottom: 0; left: 0; height: 4px; transform-origin: left; background: #e34f67; animation: toast-progress 4s linear forwards; }
@keyframes toast-progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
.toast-slide-enter-active, .toast-slide-leave-active { transition: opacity .2s ease, transform .2s ease; }
.toast-slide-enter-from, .toast-slide-leave-to { opacity: 0; transform: translateY(-10px); }
@media (max-width: 900px) { .curriculum-grid { grid-template-columns: 1fr; } .subject-group, .topic-group { grid-column: auto; } .subject-group .curriculum-form, .topic-group .curriculum-form, .curriculum-form { grid-template-columns: 1fr 1fr; } .subject-group .form-actions, .topic-group .form-actions, .curriculum-form .form-actions, .class-form .form-actions { grid-column: 1 / -1; } }
@media (max-width: 520px) { .curriculum-heading { flex-direction: column; } .curriculum-filter-grid { grid-template-columns: 1fr; }.curriculum-filter-heading { align-items: flex-start; }.subject-group .curriculum-form, .topic-group .curriculum-form, .curriculum-form { grid-template-columns: 1fr; } .subject-group .form-actions, .topic-group .form-actions, .curriculum-form .form-actions { grid-column: auto; } .curriculum-item { align-items: flex-start; flex-direction: column; } }
@media (max-width: 600px) {
  .curriculum-modal-backdrop { place-items: end center; padding: 10px; }
  .curriculum-modal { max-height: calc(100dvh - 20px); padding: 18px 16px 20px; border-radius: 20px; }
  .curriculum-modal-heading { margin-bottom: 15px; }
  .curriculum-modal-heading h2 { font-size: 1.1rem; }
  .curriculum-modal .curriculum-form { grid-template-columns: 1fr; gap: 13px; }
  .curriculum-modal .form-actions { grid-column: auto; flex-direction: column; }
  .curriculum-modal .form-actions button { width: 100%; }
}
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
  .ruas-toast { top: 14px; right: 14px; left: 14px; max-width: none; }
}
</style>
