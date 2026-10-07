<template>
  <div class="admin-view">
    <div class="admin-header">
      <div>
        <router-link to="/" class="back-link">&larr; Kembali ke latihan</router-link>
        <h1 class="page-title">Editor Soal</h1>
        <p class="page-subtitle">Tambah, ubah, hapus, dan impor soal UTBK.</p>
      </div>
      <button v-if="isAuthenticated" class="secondary-btn" @click="logout">Keluar</button>
    </div>

    <div v-if="authLoading" class="state-card">Memeriksa akses editor...</div>

    <div v-else-if="!adminEnabled" class="state-card error-state">
      <strong>Editor admin belum aktif.</strong>
      <p>Isi <code>ADMIN_PASSWORD</code> di file <code>.env</code>, lalu restart service backend.</p>
    </div>

    <form v-else-if="!isAuthenticated" class="login-card" @submit.prevent="login">
      <h2>Masuk ke editor</h2>
      <p>Gunakan password editor yang dikonfigurasi di <code>ADMIN_PASSWORD</code>.</p>
      <input v-model="password" type="password" placeholder="Password admin" autofocus />
      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <button class="primary-btn" type="submit" :disabled="loading || !password">
        {{ loading ? 'Memverifikasi...' : 'Masuk' }}
      </button>
    </form>

    <template v-else>
      <div class="toolbar">
        <input v-model="search" class="search-input" placeholder="Cari teks soal atau external_id..." @keyup.enter="loadQuestions" />
        <button class="secondary-btn" :disabled="loading" @click="loadQuestions">Cari</button>
        <button class="primary-btn" @click="startNew">+ Soal Baru</button>
      </div>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

      <section class="editor-grid">
        <div class="panel question-list-panel">
          <div class="panel-heading">
            <h2>Daftar Soal</h2>
            <span>{{ questions.length }} soal</span>
          </div>

          <div v-if="loading" class="panel-empty">Memuat...</div>
          <div v-else-if="questions.length === 0" class="panel-empty">Belum ada soal yang cocok.</div>
          <button
            v-for="item in questions"
            :key="item.id"
            class="question-row"
            :class="{ active: editingId === item.id }"
            @click="editQuestion(item.id)"
          >
            <span class="row-meta">#{{ item.id }} · {{ item.topic_label }} · {{ difficultyLabel(item.difficulty) }}</span>
            <strong>{{ item.question_text }}</strong>
            <span v-if="item.external_id" class="row-id">{{ item.external_id }}</span>
          </button>
        </div>

        <div class="panel form-panel">
          <div class="panel-heading">
            <h2>{{ editingId === null ? 'Soal Baru' : `Edit Soal #${editingId}` }}</h2>
            <button v-if="editingId !== null" class="danger-link" @click="removeQuestion">Hapus</button>
          </div>

          <form @submit.prevent="saveQuestion">
            <label>Topik
              <select v-model.number="draft.topic_id" required>
                <option :value="0" disabled>Pilih topik</option>
                <option v-for="topic in topics" :key="topic.id" :value="topic.id">
                  {{ topic.subject_label }} — {{ topic.label }}
                </option>
              </select>
            </label>

            <div class="field-row">
              <label>Tipe soal
                <select v-model="draft.type" @change="syncOptionsForType">
                  <option value="single_choice">Pilihan Ganda</option>
                  <option value="multiple_response">Pilihan Ganda Kompleks</option>
                  <option value="true_false">Benar / Salah</option>
                </select>
              </label>
              <label>Kesulitan
                <select v-model="draft.difficulty">
                  <option value="easy">Mudah</option>
                  <option value="medium">Sedang</option>
                  <option value="hard">Sulit</option>
                </select>
              </label>
            </div>

            <label>External ID
              <input v-model="draft.external_id" placeholder="Contoh: q_aljabar_003" />
            </label>

            <label>Pertanyaan
              <textarea v-model="draft.question_text" rows="5" required placeholder="Tulis pertanyaan..."></textarea>
            </label>

            <fieldset>
              <legend>Opsi Jawaban</legend>
              <div v-for="(option, index) in draft.options" :key="index" class="option-editor">
                <input v-model="option.key" class="option-key-input" maxlength="5" aria-label="Key opsi" />
                <input v-model="option.text" class="option-text-input" placeholder="Teks opsi" required />
                <label class="correct-toggle">
                  <input v-model="option.is_correct" type="checkbox" /> benar
                </label>
                <button v-if="draft.type !== 'true_false' && draft.options.length > 2" type="button" class="remove-option" @click="removeOption(index)">×</button>
              </div>
              <button v-if="draft.type !== 'true_false'" type="button" class="add-option" @click="addOption">+ Tambah opsi</button>
            </fieldset>

            <label>Pembahasan
              <textarea v-model="draft.explanation_text" rows="5" required placeholder="Tulis pembahasan..."></textarea>
            </label>

            <p v-if="formMessage" :class="formMessageType === 'error' ? 'error-text' : 'success-text'">{{ formMessage }}</p>
            <button class="primary-btn full-btn" type="submit" :disabled="saving">
              {{ saving ? 'Menyimpan...' : 'Simpan Soal' }}
            </button>
          </form>
        </div>
      </section>

      <section class="panel import-panel">
        <div class="panel-heading">
          <div>
            <h2>Import JSON</h2>
            <p>Terima array soal atau object seed dengan properti <code>questions</code>.</p>
          </div>
          <select v-model="importMode">
            <option value="insert">Tambah baru saja</option>
            <option value="upsert">Tambah atau perbarui berdasarkan ID</option>
          </select>
        </div>
        <textarea v-model="importText" class="import-textarea" rows="12" placeholder='[{ "topic_slug": "aljabar", ... }]' spellcheck="false"></textarea>
        <div class="import-actions">
          <button class="secondary-btn" :disabled="importing || !importText.trim()" @click="previewImport">Preview</button>
          <button class="primary-btn" :disabled="importing || !parsedImport" @click="applyImport">Terapkan Import</button>
        </div>
        <div v-if="importSummary" class="import-summary">
          <strong>{{ importSummary.inserted }} baru · {{ importSummary.updated }} diperbarui · {{ importSummary.skipped }} dilewati</strong>
          <p v-for="error in importSummary.errors" :key="error" class="error-text">{{ error }}</p>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  adminLogin,
  createAdminQuestion,
  deleteAdminQuestion,
  fetchAdminAuthStatus,
  fetchAdminQuestion,
  fetchAdminQuestions,
  fetchAdminTopics,
  importAdminQuestions,
  updateAdminQuestion,
} from '@/api/client';
import type { AdminQuestionInput, AdminQuestionListItem, AdminTopic, ImportSummary } from '@/types';

const router = useRouter();
const adminEnabled = ref(false);
const authLoading = ref(true);
const isAuthenticated = ref(Boolean(sessionStorage.getItem('admin_token')));
const password = ref('');
const loading = ref(false);
const saving = ref(false);
const importing = ref(false);
const errorMessage = ref('');
const formMessage = ref('');
const formMessageType = ref<'success' | 'error'>('success');
const questions = ref<AdminQuestionListItem[]>([]);
const topics = ref<AdminTopic[]>([]);
const search = ref('');
const editingId = ref<number | null>(null);
const importText = ref('');
const parsedImport = ref<unknown>(null);
const importMode = ref<'insert' | 'upsert'>('insert');
const importSummary = ref<ImportSummary | null>(null);

function createDefaultOptions(type: AdminQuestionInput['type']) {
  if (type === 'true_false') {
    return [
      { key: 'true', text: 'Benar', is_correct: true },
      { key: 'false', text: 'Salah', is_correct: false },
    ];
  }

  return ['A', 'B', 'C', 'D'].map((key) => ({ key, text: '', is_correct: false }));
}

function createDraft(): AdminQuestionInput {
  return {
    topic_id: 0,
    type: 'single_choice',
    difficulty: 'easy',
    external_id: null,
    question_text: '',
    explanation_text: '',
    options: createDefaultOptions('single_choice'),
  };
}

const draft = reactive<AdminQuestionInput>(createDraft());

function setDraft(input: AdminQuestionInput) {
  Object.assign(draft, input);
  draft.options = input.options.map((option) => ({ ...option }));
}

function resetDraft() {
  setDraft(createDraft());
  editingId.value = null;
  formMessage.value = '';
}

function startNew() {
  resetDraft();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function login() {
  loading.value = true;
  errorMessage.value = '';
  try {
    await adminLogin(password.value);
    password.value = '';
    isAuthenticated.value = true;
    await loadData();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal login admin.';
  } finally {
    loading.value = false;
  }
}

function logout() {
  sessionStorage.removeItem('admin_token');
  isAuthenticated.value = false;
  router.replace('/admin');
}

async function loadQuestions() {
  loading.value = true;
  errorMessage.value = '';
  try {
    questions.value = await fetchAdminQuestions(search.value);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat soal.';
  } finally {
    loading.value = false;
  }
}

async function loadData() {
  try {
    const [questionRows, topicRows] = await Promise.all([fetchAdminQuestions(), fetchAdminTopics()]);
    questions.value = questionRows;
    topics.value = topicRows;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat data editor.';
  }
}

async function editQuestion(id: number) {
  try {
    const question = await fetchAdminQuestion(id);
    setDraft({
      topic_id: question.topic_id,
      type: question.type,
      difficulty: question.difficulty,
      external_id: question.external_id,
      question_text: question.question_text,
      explanation_text: question.explanation_text,
      options: question.options,
    });
    editingId.value = id;
    formMessage.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat soal.';
  }
}

function syncOptionsForType() {
  draft.options = createDefaultOptions(draft.type);
}

function addOption() {
  const nextKey = String.fromCharCode(65 + draft.options.length);
  draft.options.push({ key: nextKey, text: '', is_correct: false });
}

function removeOption(index: number) {
  draft.options.splice(index, 1);
}

async function saveQuestion() {
  saving.value = true;
  formMessage.value = '';
  try {
    if (editingId.value === null) {
      const id = await createAdminQuestion(draft);
      resetDraft();
      formMessage.value = `Soal #${id} berhasil dibuat.`;
    } else {
      await updateAdminQuestion(editingId.value, draft);
      formMessage.value = 'Soal berhasil diperbarui.';
    }
    formMessageType.value = 'success';
    await loadQuestions();
  } catch (error) {
    formMessageType.value = 'error';
    formMessage.value = error instanceof Error ? error.message : 'Gagal menyimpan soal.';
  } finally {
    saving.value = false;
  }
}

async function removeQuestion() {
  if (editingId.value === null || !window.confirm(`Hapus soal #${editingId.value}?`)) return;

  try {
    await deleteAdminQuestion(editingId.value);
    resetDraft();
    await loadQuestions();
  } catch (error) {
    formMessageType.value = 'error';
    formMessage.value = error instanceof Error ? error.message : 'Gagal menghapus soal.';
  }
}

function difficultyLabel(value: AdminQuestionListItem['difficulty']) {
  return { easy: 'Mudah', medium: 'Sedang', hard: 'Sulit' }[value];
}

function parseImportText(): unknown | null {
  try {
    return JSON.parse(importText.value);
  } catch {
    errorMessage.value = 'JSON tidak valid. Periksa koma, kurung, dan tanda kutip.';
    return null;
  }
}

async function previewImport() {
  const data = parseImportText();
  if (data === null) return;
  importing.value = true;
  errorMessage.value = '';
  try {
    parsedImport.value = data;
    importSummary.value = await importAdminQuestions(data, importMode.value, true);
  } catch (error) {
    parsedImport.value = null;
    errorMessage.value = error instanceof Error ? error.message : 'Import tidak valid.';
  } finally {
    importing.value = false;
  }
}

async function applyImport() {
  if (parsedImport.value === null || !window.confirm('Terapkan import soal ini?')) return;
  importing.value = true;
  try {
    importSummary.value = await importAdminQuestions(parsedImport.value, importMode.value, false);
    await loadQuestions();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal menerapkan import.';
  } finally {
    importing.value = false;
  }
}

onMounted(async () => {
  try {
    adminEnabled.value = await fetchAdminAuthStatus();
    if (adminEnabled.value && isAuthenticated.value) await loadData();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memeriksa akses editor.';
  } finally {
    authLoading.value = false;
  }
});
</script>

<style scoped>
.admin-view { display: flex; flex-direction: column; gap: 20px; }
.admin-header, .toolbar, .panel-heading, .import-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.back-link { color: #556677; text-decoration: none; font-size: 0.9rem; }
.page-title { color: #1e40af; font-size: 1.8rem; margin-top: 8px; }
.page-subtitle, .panel-heading p, .login-card p { color: #667788; }
.state-card, .login-card, .panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.login-card { max-width: 420px; margin: 40px auto; width: 100%; display: flex; flex-direction: column; gap: 14px; }
.login-card h2, .panel h2 { color: #1e40af; font-size: 1.15rem; }
.login-card input, label input, label select, label textarea, .search-input, .import-panel select { width: 100%; padding: 10px 12px; border: 2px solid #d4dde6; border-radius: 8px; font: inherit; }
.primary-btn, .secondary-btn { border: 0; border-radius: 8px; padding: 10px 16px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.primary-btn { color: #fff; background: #1e40af; }
.secondary-btn { color: #1e40af; background: #e8edf5; }
.primary-btn:disabled, .secondary-btn:disabled { opacity: .6; cursor: default; }
.full-btn { width: 100%; }
.toolbar { justify-content: flex-start; }
.search-input { max-width: 420px; }
.editor-grid { display: grid; grid-template-columns: minmax(260px, .8fr) minmax(360px, 1.2fr); gap: 20px; align-items: start; }
.question-list-panel { padding: 0; overflow: hidden; }
.question-list-panel .panel-heading, .form-panel .panel-heading, .import-panel .panel-heading { padding: 20px; border-bottom: 1px solid #e2e8f0; }
.panel-heading span { color: #778899; font-size: .9rem; }
.question-row { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; width: 100%; padding: 14px 20px; border: 0; border-bottom: 1px solid #edf1f5; background: #fff; text-align: left; cursor: pointer; }
.question-row:hover, .question-row.active { background: #f0f4ff; }
.row-meta, .row-id { color: #778899; font-size: .8rem; }
.panel-empty { padding: 24px 20px; color: #778899; }
.form-panel form { display: flex; flex-direction: column; gap: 14px; padding: 20px; }
label { display: flex; flex-direction: column; gap: 6px; color: #445566; font-weight: 600; }
textarea { resize: vertical; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
fieldset { border: 1px solid #d4dde6; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
legend { padding: 0 6px; color: #445566; font-weight: 600; }
.option-editor { display: flex; align-items: center; gap: 8px; }
.option-key-input { width: 54px; padding: 8px; border: 1px solid #d4dde6; border-radius: 6px; }
.option-text-input { min-width: 0; flex: 1; padding: 8px; border: 1px solid #d4dde6; border-radius: 6px; }
.correct-toggle { flex-direction: row; align-items: center; white-space: nowrap; font-size: .85rem; }
.remove-option, .danger-link { color: #c53030; border: 0; background: transparent; cursor: pointer; font-weight: 700; }
.add-option { align-self: flex-start; color: #1e40af; border: 0; background: transparent; cursor: pointer; font-weight: 600; }
.import-panel { display: flex; flex-direction: column; gap: 14px; }
.import-panel .panel-heading { margin: -20px -20px 0; }
.import-panel .panel-heading p { font-size: .85rem; margin-top: 4px; }
.import-textarea { width: 100%; padding: 12px; border: 2px solid #d4dde6; border-radius: 8px; font: 0.9rem monospace; }
.import-actions { justify-content: flex-start; }
.import-summary { background: #f0f4ff; padding: 12px; border-radius: 8px; }
.error-text { color: #c53030; }
.success-text { color: #2f855a; }
code { background: #edf1f5; padding: 2px 4px; border-radius: 4px; }
@media (max-width: 720px) { .editor-grid { grid-template-columns: 1fr; } .toolbar { flex-wrap: wrap; } .search-input { max-width: none; flex: 1; } .field-row { grid-template-columns: 1fr; } .admin-header { align-items: flex-start; } }
</style>
