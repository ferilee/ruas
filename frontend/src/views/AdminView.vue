<template>
  <div class="admin-view">
    <div v-if="!isAuthenticated" class="admin-header">
      <div>
        <router-link to="/" class="back-link">&larr; Kembali ke latihan</router-link>
        <h1 class="page-title">Editor Soal</h1>
        <p class="page-subtitle">Tambah, ubah, hapus, dan impor soal ujian sekolah.</p>
      </div>
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
      <div class="admin-layout">
        <aside class="admin-sidebar">
          <div class="sidebar-brand">
            <span class="sidebar-mark">R</span>
            <div>
              <strong>RUAS Admin</strong>
              <small>Ruang Asesmen</small>
            </div>
          </div>
          <p class="sidebar-label">MENU UTAMA</p>
          <nav class="admin-nav" aria-label="Navigasi admin">
            <button
              v-for="item in navigation"
              :key="item.id"
              type="button"
              :class="['nav-item', { active: activeSection === item.id }]"
              @click="selectSection(item.id)"
            >
              <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </button>
          </nav>
          <div class="sidebar-help">
            <strong>Butuh bantuan?</strong>
            <span>Pilih menu sesuai pekerjaan yang ingin dilakukan.</span>
          </div>
        </aside>

        <main class="admin-content">
          <div class="admin-header dashboard-header">
            <div>
              <router-link to="/" class="back-link">&larr; Kembali ke latihan</router-link>
              <h1 class="page-title">{{ currentSectionTitle }}</h1>
              <p class="page-subtitle">{{ currentSectionDescription }}</p>
            </div>
            <button class="secondary-btn" @click="logout">Keluar</button>
          </div>

          <section v-if="activeSection === 'overview'" class="overview-section">
            <div class="welcome-card">
              <div>
                <span class="eyebrow">DASHBOARD EDITOR</span>
                <h2>Selamat datang di Admin RUAS</h2>
                <p>Kelola struktur asesmen, bank soal, dan jadwal dari satu tempat.</p>
              </div>
              <button class="primary-btn" type="button" @click="selectSection('questions')">Kelola Bank Soal</button>
            </div>
            <div class="stats-grid">
              <button class="stat-card" type="button" @click="selectSection('curriculum')">
                <span class="stat-icon blue">▦</span>
                <span><strong>Struktur Asesmen</strong><small>Atur kelas dan mata pelajaran</small></span>
                <b>→</b>
              </button>
              <button class="stat-card" type="button" @click="selectSection('questions')">
                <span class="stat-icon purple">?</span>
                <span><strong>{{ questions.length }} Soal</strong><small>{{ topics.length }} topik tersedia</small></span>
                <b>→</b>
              </button>
              <button class="stat-card" type="button" @click="selectSection('schedule')">
                <span class="stat-icon green">◷</span>
                <span><strong>{{ scheduleStartAt ? 'Terjadwal' : 'Terbuka' }}</strong><small>{{ scheduleStartAt ? 'Menunggu waktu mulai' : 'Peserta dapat mulai' }}</small></span>
                <b>→</b>
              </button>
            </div>
            <section class="panel quick-actions">
              <div class="panel-heading">
                <div><h2>Aksi cepat</h2><p>Mulai dari pekerjaan yang paling sering dilakukan.</p></div>
              </div>
              <div class="quick-action-grid">
                <button type="button" @click="startNew(); selectSection('questions')"><strong>＋ Tambah soal</strong><span>Buat soal baru dan pembahasannya.</span></button>
                <button type="button" @click="selectSection('curriculum')"><strong>▣ Atur kurikulum</strong><span>Kelola kelas, asesmen, dan mata pelajaran.</span></button>
                <button type="button" @click="selectSection('schedule')"><strong>◷ Atur jadwal</strong><span>Tentukan kapan asesmen dibuka.</span></button>
              </div>
            </section>
          </section>

          <CurriculumPanel v-else-if="activeSection === 'curriculum'" />

          <UsersPanel v-else-if="activeSection === 'users'" />

          <section v-else-if="activeSection === 'schedule'" class="panel schedule-panel">
        <div class="panel-heading">
          <div>
            <h2>Jadwal Asesmen</h2>
            <p>Peserta baru dapat mulai mengerjakan setelah waktu ini tiba.</p>
          </div>
          <span v-if="scheduleStartAt" class="schedule-status">Terjadwal</span>
          <span v-else class="schedule-status open">Terbuka</span>
        </div>

        <form class="schedule-form" @submit.prevent="saveSchedule">
          <label>Waktu mulai
            <input v-model="scheduleStartAt" type="datetime-local" />
          </label>
          <div class="schedule-actions">
            <button class="primary-btn" type="submit" :disabled="scheduleSaving">
              {{ scheduleSaving ? 'Menyimpan...' : 'Simpan Jadwal' }}
            </button>
            <button class="secondary-btn" type="button" :disabled="scheduleSaving || !scheduleStartAt" @click="openScheduleNow">
              Buka Sekarang
            </button>
          </div>
        </form>
        <p class="field-hint schedule-hint">Kosongkan waktu lalu simpan untuk membuka asesmen segera.</p>
        <p v-if="scheduleMessage" :class="scheduleMessageType === 'error' ? 'error-text' : 'success-text'">{{ scheduleMessage }}</p>
      </section>

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
            <strong><MathText :text="item.question_text" /></strong>
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
              <small class="field-hint">Rumus: \( ... \) untuk inline atau \[ ... \] untuk blok. Format lama seperti c^2 dan akar(100) juga didukung.</small>
            </label>
            <div v-if="draft.question_text.trim()" class="math-preview">
              <span class="preview-label">Preview pertanyaan</span>
              <MathText :text="draft.question_text" />
            </div>

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
              <small class="field-hint">Gunakan sintaks LaTeX dengan delimiter agar rumus panjang tampil sebagai satu persamaan.</small>
            </label>
            <div v-if="draft.explanation_text.trim()" class="math-preview">
              <span class="preview-label">Preview pembahasan</span>
              <MathText :text="draft.explanation_text" />
            </div>

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
        </main>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import MathText from '@/components/MathText.vue';
import CurriculumPanel from '@/components/CurriculumPanel.vue';
import UsersPanel from '@/components/UsersPanel.vue';
import {
  adminLogin,
  createAdminQuestion,
  deleteAdminQuestion,
  fetchAdminAuthStatus,
  fetchAdminQuestion,
  fetchAdminQuestions,
  fetchAdminSchedule,
  fetchAdminTopics,
  importAdminQuestions,
  updateAdminQuestion,
  updateAdminSchedule,
} from '@/api/client';
import type { AdminQuestionInput, AdminQuestionListItem, AdminTopic, ImportSummary } from '@/types';

const router = useRouter();
type AdminSection = 'overview' | 'curriculum' | 'questions' | 'schedule' | 'users';
const navigation: Array<{ id: AdminSection; label: string; icon: string; title: string; description: string }> = [
  { id: 'overview', label: 'Ringkasan', icon: '⌂', title: 'Ringkasan', description: 'Pantau isi dan status asesmen RUAS.' },
  { id: 'curriculum', label: 'Struktur Asesmen', icon: '▦', title: 'Struktur Asesmen', description: 'Atur kelas, jenis asesmen, dan mata pelajaran.' },
  { id: 'questions', label: 'Bank Soal', icon: '?', title: 'Bank Soal', description: 'Buat, cari, dan kelola soal beserta pembahasannya.' },
  { id: 'schedule', label: 'Jadwal Asesmen', icon: '◷', title: 'Jadwal Asesmen', description: 'Tentukan kapan peserta boleh memulai asesmen.' },
  { id: 'users', label: 'Pengguna', icon: '♙', title: 'Pengguna', description: 'Tambah akun secara manual atau import dari CSV/JSON.' },
];
const activeSection = ref<AdminSection>('overview');
const currentSection = computed(() => navigation.find((item) => item.id === activeSection.value) ?? navigation[0]);
const currentSectionTitle = computed(() => currentSection.value.title);
const currentSectionDescription = computed(() => currentSection.value.description);
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
const scheduleStartAt = ref('');
const scheduleSaving = ref(false);
const scheduleMessage = ref('');
const scheduleMessageType = ref<'success' | 'error'>('success');

function selectSection(section: AdminSection) {
  activeSection.value = section;
  errorMessage.value = '';
}

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

    try {
      const schedule = await fetchAdminSchedule();
      scheduleStartAt.value = toDateTimeLocal(schedule.start_at);
    } catch (error) {
      scheduleStartAt.value = '';
      scheduleMessageType.value = 'error';
      scheduleMessage.value = error instanceof Error
        ? `Jadwal belum dapat dimuat: ${error.message}`
        : 'Jadwal belum dapat dimuat.';
    }
  } catch (error) {
    isAuthenticated.value = false;
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat data editor.';
  }
}

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function saveSchedule() {
  let startAt: string | null = null;
  if (scheduleStartAt.value) {
    const date = new Date(scheduleStartAt.value);
    if (Number.isNaN(date.getTime())) {
      scheduleMessageType.value = 'error';
      scheduleMessage.value = 'Waktu mulai tidak valid.';
      return;
    }
    startAt = date.toISOString();
  }

  scheduleSaving.value = true;
  scheduleMessage.value = '';
  try {
    const schedule = await updateAdminSchedule(startAt);
    scheduleStartAt.value = toDateTimeLocal(schedule.start_at);
    scheduleMessageType.value = 'success';
    scheduleMessage.value = schedule.start_at ? 'Jadwal asesmen berhasil disimpan.' : 'Asesmen dibuka segera.';
  } catch (error) {
    scheduleMessageType.value = 'error';
    scheduleMessage.value = error instanceof Error ? error.message : 'Gagal menyimpan jadwal.';
  } finally {
    scheduleSaving.value = false;
  }
}

async function openScheduleNow() {
  scheduleStartAt.value = '';
  await saveSchedule();
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
.admin-view { min-height: 100vh; padding: 32px clamp(18px, 4vw, 56px) 48px; color: #1d3557; }
.admin-layout { display: grid; grid-template-columns: 238px minmax(0, 1fr); gap: 28px; max-width: 1280px; margin: 0 auto; align-items: start; }
.admin-sidebar { position: sticky; top: 24px; display: flex; min-height: calc(100vh - 80px); flex-direction: column; padding: 20px 14px; border: 1px solid #dce7f4; border-radius: 18px; background: linear-gradient(180deg, #fff 0%, #f7faff 100%); box-shadow: 0 14px 34px rgba(31, 74, 126, .08); }
.sidebar-brand { display: flex; align-items: center; gap: 10px; padding: 4px 8px 24px; }
.sidebar-mark { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 12px; color: #fff; background: linear-gradient(145deg, #1d72d8, #1945aa); font-size: 1.3rem; font-weight: 800; }
.sidebar-brand strong, .sidebar-brand small { display: block; }
.sidebar-brand strong { color: #173b77; font-size: .95rem; }
.sidebar-brand small { margin-top: 2px; color: #7b91ad; font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; }
.sidebar-label { padding: 0 12px 8px; color: #91a3b8; font-size: .66rem; font-weight: 800; letter-spacing: .12em; }
.admin-nav { display: flex; flex-direction: column; gap: 5px; }
.nav-item { display: flex; align-items: center; gap: 11px; width: 100%; padding: 12px; border: 0; border-radius: 10px; color: #607693; background: transparent; font: inherit; font-size: .86rem; font-weight: 650; text-align: left; cursor: pointer; transition: .18s ease; }
.nav-item:hover { color: #1d5fc0; background: #edf4ff; }
.nav-item.active { color: #fff; background: linear-gradient(100deg, #2378db, #2251b5); box-shadow: 0 7px 16px rgba(35, 101, 199, .2); }
.nav-icon { display: grid; width: 24px; place-items: center; font-size: 1.05rem; font-weight: 800; }
.sidebar-help { display: flex; margin-top: auto; flex-direction: column; gap: 5px; padding: 14px 12px; border-radius: 12px; color: #69809e; background: #edf5ff; font-size: .72rem; line-height: 1.5; }
.sidebar-help strong { color: #24559c; font-size: .78rem; }
.admin-content { min-width: 0; }
.dashboard-header { margin-bottom: 25px; }
.dashboard-header .page-title { margin-top: 10px; }
.overview-section { display: flex; flex-direction: column; gap: 20px; }
.welcome-card { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 28px 30px; border-radius: 18px; color: #fff; background: linear-gradient(115deg, #185db7 0%, #2686df 100%); box-shadow: 0 14px 30px rgba(29, 103, 190, .2); }
.welcome-card h2 { margin: 5px 0 6px; font-size: clamp(1.35rem, 2vw, 1.8rem); }
.welcome-card p { color: rgba(255,255,255,.78); font-size: .9rem; }
.welcome-card .primary-btn { color: #1754aa; background: #fff; }
.eyebrow { color: #b9dcff; font-size: .68rem; font-weight: 800; letter-spacing: .14em; }
.stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.stat-card { display: flex; align-items: center; gap: 11px; min-width: 0; padding: 17px; border: 1px solid #e0e9f3; border-radius: 14px; color: #2a4567; background: #fff; box-shadow: 0 7px 18px rgba(31, 74, 126, .05); font: inherit; text-align: left; cursor: pointer; }
.stat-card:hover { border-color: #a7c8ef; transform: translateY(-1px); }
.stat-card > span:nth-child(2) { min-width: 0; flex: 1; }
.stat-card strong, .stat-card small { display: block; }
.stat-card strong { color: #244978; font-size: .9rem; }
.stat-card small { margin-top: 3px; color: #879ab2; font-size: .7rem; }
.stat-card b { color: #2d70c6; font-size: 1.2rem; }
.stat-icon { display: grid; width: 37px; height: 37px; flex-shrink: 0; place-items: center; border-radius: 11px; font-weight: 800; }
.stat-icon.blue { color: #1f68bd; background: #e5f1ff; }
.stat-icon.purple { color: #7650b6; background: #f0eaff; }
.stat-icon.green { color: #2c8c67; background: #e3f7ed; }
.quick-actions { display: flex; flex-direction: column; gap: 16px; }
.quick-action-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.quick-action-grid button { display: flex; min-width: 0; flex-direction: column; align-items: flex-start; gap: 5px; padding: 15px; border: 1px solid #e1eaf4; border-radius: 11px; color: #68809d; background: #f9fbfe; font: inherit; text-align: left; cursor: pointer; }
.quick-action-grid button:hover { border-color: #98bee9; background: #f0f6ff; }
.quick-action-grid strong { color: #24589e; font-size: .84rem; }
.quick-action-grid span { font-size: .75rem; line-height: 1.45; }
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
.field-hint { color: #778899; font-weight: 400; font-size: .8rem; }
.math-preview { padding: 12px; border: 1px dashed #b8c5d5; border-radius: 8px; background: #f8fafc; color: #445566; }
.preview-label { display: block; margin-bottom: 6px; color: #778899; font-size: .8rem; font-weight: 700; }
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

<style scoped>
.schedule-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.schedule-panel .panel-heading {
  align-items: flex-start;
  margin: -20px -20px 0;
}

.schedule-panel .panel-heading p {
  margin-top: 4px;
  font-size: 0.85rem;
}

.schedule-status {
  padding: 5px 10px;
  border-radius: 999px;
  color: #9b6500;
  background: #fff2c2;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.schedule-status.open {
  color: #23734b;
  background: #dcf7e9;
}

.schedule-form {
  display: flex;
  align-items: flex-end;
  gap: 14px;
}

.schedule-form label {
  width: min(100%, 320px);
}

.schedule-actions {
  display: flex;
  gap: 8px;
}

.schedule-hint {
  margin-top: -4px;
}

@media (max-width: 620px) {
  .schedule-form,
  .schedule-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .schedule-form label {
    width: 100%;
  }
}

@media (max-width: 960px) {
  .admin-layout { grid-template-columns: 190px minmax(0, 1fr); gap: 18px; }
  .stats-grid { grid-template-columns: 1fr; }
  .quick-action-grid { grid-template-columns: 1fr; }
}

@media (max-width: 720px) {
  .admin-view { padding: 18px 14px 32px; }
  .admin-layout { display: block; }
  .admin-sidebar { position: static; min-height: 0; margin-bottom: 20px; padding: 14px; }
  .sidebar-brand { padding-bottom: 14px; }
  .sidebar-help { display: none; }
  .admin-nav { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .nav-item { padding: 10px; font-size: .78rem; }
  .welcome-card { align-items: flex-start; flex-direction: column; padding: 22px; }
  .dashboard-header { align-items: flex-start; }
  .dashboard-header .secondary-btn { align-self: flex-start; }
}
</style>
