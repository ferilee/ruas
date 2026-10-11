<template>
  <div class="admin-view">
    <ConfirmDialog :open="confirmOpen" :title="confirmTitle" :message="confirmMessage" :confirm-label="confirmLabel" @confirm="runConfirmation" @cancel="closeConfirmation" />
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

          <CurriculumPanel v-else-if="activeSection === 'curriculum'" @topics-updated="loadData" />

          <ReportsPanel v-else-if="activeSection === 'reports'" />

          <UsersPanel v-else-if="activeSection === 'users'" />

          <section v-else-if="activeSection === 'schedule'" class="panel schedule-panel">
        <div class="schedule-hero">
          <span class="schedule-icon" aria-hidden="true">◷</span>
          <div><span class="schedule-eyebrow">AKSES ASESMEN</span><h2>Jadwal Asesmen</h2><p>Atur kapan peserta dapat mulai mengerjakan.</p></div>
          <span v-if="scheduleStartAt" class="schedule-status">Terjadwal</span>
          <span v-else class="schedule-status open">Terbuka</span>
        </div>

        <div class="schedule-time-card"><span>Waktu mulai</span><strong>{{ scheduleStartAt ? formatScheduleLabel(scheduleStartAt) : 'Terbuka sekarang' }}</strong><small>{{ scheduleStartAt ? 'Peserta menunggu sampai waktu ini.' : 'Peserta dapat langsung memulai asesmen.' }}</small></div>

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
          <div class="question-toolbar">
            <div class="toolbar-search">
              <input v-model="search" class="search-input" placeholder="Cari teks soal atau external_id..." @keyup.enter="loadQuestions" />
              <button class="secondary-btn" type="button" :disabled="loading" @click="loadQuestions">Cari</button>
            </div>
            <button class="primary-btn new-question-button" type="button" @click="startNew">＋ Soal Baru</button>
          </div>

          <div class="question-filters" aria-label="Filter tingkat kesulitan">
            <button v-for="filter in difficultyFilters" :key="filter.value" type="button" :class="['filter-chip', { active: difficultyFilter === filter.value }]" @click="difficultyFilter = filter.value">{{ filter.label }}</button>
          </div>

          <section class="panel topic-access-panel">
            <div class="panel-heading">
              <div><h2>Akses Topik</h2><p>Kunci topik dengan token yang dibagikan oleh pengawas.</p></div>
            </div>
            <p class="field-hint">Token disimpan secara aman. Kosongkan kolom token saat memperbarui jika token lama tetap digunakan.</p>
            <p v-if="topicAccessMessage" :class="topicAccessMessageType === 'error' ? 'error-text' : 'success-text'">{{ topicAccessMessage }}</p>
            <div class="topic-access-list">
              <article v-for="topic in topics" :key="topic.id" class="topic-access-row">
                <div class="topic-access-info"><strong>{{ topic.label }}</strong><small>{{ topic.subject_label }} · {{ topic.token_configured ? 'Token sudah dikonfigurasi' : 'Tanpa token' }}</small></div>
                <div class="topic-access-controls">
                  <label class="token-toggle"><input v-model="topicAccessDrafts[topic.id].requires_token" type="checkbox" /> Wajib token</label>
                  <input v-model="topicAccessDrafts[topic.id].token" type="text" autocomplete="off" :placeholder="topic.token_configured ? 'Token baru (opsional)' : 'Masukkan token'" />
                  <button class="primary-btn" type="button" :disabled="topicAccessSavingId === topic.id" @click="saveTopicAccess(topic)">{{ topicAccessSavingId === topic.id ? 'Menyimpan...' : 'Simpan' }}</button>
                </div>
              </article>
            </div>
          </section>

          <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

          <section class="editor-grid">
        <div class="panel question-list-panel">
          <div class="panel-heading">
            <h2>Daftar Soal</h2>
            <span>{{ filteredQuestions.length }} soal</span>
          </div>

          <div v-if="loading" class="panel-empty">Memuat...</div>
          <div v-else-if="filteredQuestions.length === 0" class="panel-empty">Belum ada soal yang cocok.</div>
          <button
            v-for="item in filteredQuestions"
            :key="item.id"
            class="question-row"
            :class="{ active: editingId === item.id }"
            type="button"
            @click="editQuestion(item.id)"
          >
            <span class="question-row-top"><span class="question-number">#{{ item.id }}</span><span class="topic-badge">{{ item.topic_label }}</span><span class="question-menu" aria-hidden="true">⋮</span></span>
            <strong><MathText :text="item.question_text" /></strong>
            <span class="question-row-bottom"><span :class="['difficulty-badge', `difficulty-${item.difficulty}`]">{{ difficultyLabel(item.difficulty) }}</span><span v-if="item.external_id" class="row-id">{{ item.external_id }}</span></span>
          </button>
        </div>

        <div class="panel form-panel" :class="{ open: questionFormOpen }">
          <div class="panel-heading">
            <h2>{{ editingId === null ? 'Soal Baru' : `Edit Soal #${editingId}` }}</h2>
            <div class="form-heading-actions"><button v-if="editingId !== null" type="button" class="danger-link" @click="removeQuestion">Hapus</button><button class="close-form-btn" type="button" aria-label="Tutup form soal" @click="closeQuestionForm">×</button></div>
          </div>

          <form @submit.prevent="saveQuestion">
            <label>Topik
              <RuasSelect v-model="draft.topic_id" :options="topicOptions" placeholder="Pilih topik" aria-label="Topik soal" />
            </label>

            <div class="field-row">
              <label>Tipe soal
                <RuasSelect v-model="draft.type" :options="questionTypeOptions" aria-label="Tipe soal" @change="syncOptionsForType" />
              </label>
              <label>Kesulitan
                <RuasSelect v-model="draft.difficulty" :options="difficultyOptions" aria-label="Kesulitan soal" />
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
          <RuasSelect v-model="importMode" :options="importModeOptions" aria-label="Mode import soal" />
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

      <nav class="mobile-bottom-nav" aria-label="Navigasi admin mobile">
        <button
          v-for="item in mobilePrimaryNavigation"
          :key="item.id"
          type="button"
          :class="['mobile-nav-item', { active: activeSection === item.id }]"
          @click="selectSection(item.id)"
        >
          <span class="mobile-nav-icon" aria-hidden="true">{{ item.icon }}</span>
          <span>{{ item.label === 'Struktur Asesmen' ? 'Kurikulum' : item.label }}</span>
        </button>
        <button type="button" :class="['mobile-nav-item', { active: moreMenuOpen || ['schedule', 'users'].includes(activeSection) }]" @click="moreMenuOpen = !moreMenuOpen">
          <span class="mobile-nav-icon" aria-hidden="true">•••</span>
          <span>Lainnya</span>
        </button>
      </nav>

      <div v-if="moreMenuOpen" class="mobile-more-backdrop" @click="moreMenuOpen = false"></div>
      <section v-if="moreMenuOpen" class="mobile-more-menu" aria-label="Menu admin lainnya">
        <div class="mobile-more-heading"><strong>Menu lainnya</strong><button type="button" aria-label="Tutup menu" @click="moreMenuOpen = false">×</button></div>
        <button v-for="item in mobileSecondaryNavigation" :key="item.id" type="button" class="mobile-more-item" @click="selectSection(item.id)">
          <span class="mobile-nav-icon" aria-hidden="true">{{ item.icon }}</span><span>{{ item.label }}</span><span aria-hidden="true">›</span>
        </button>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import MathText from '@/components/MathText.vue';
import CurriculumPanel from '@/components/CurriculumPanel.vue';
import ReportsPanel from '@/components/ReportsPanel.vue';
import RuasSelect from '@/components/RuasSelect.vue';
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
  updateAdminTopicAccess,
  updateAdminQuestion,
  updateAdminSchedule,
} from '@/api/client';
import type { AdminQuestionInput, AdminQuestionListItem, AdminTopic, ImportSummary } from '@/types';

const router = useRouter();
type AdminSection = 'overview' | 'curriculum' | 'questions' | 'schedule' | 'reports' | 'users';
const navigation: Array<{ id: AdminSection; label: string; icon: string; title: string; description: string }> = [
  { id: 'overview', label: 'Ringkasan', icon: '⌂', title: 'Ringkasan', description: 'Pantau isi dan status asesmen RUAS.' },
  { id: 'curriculum', label: 'Struktur Asesmen', icon: '▦', title: 'Struktur Asesmen', description: 'Atur kelas, jenis asesmen, dan mata pelajaran.' },
  { id: 'questions', label: 'Bank Soal', icon: '?', title: 'Bank Soal', description: 'Buat, cari, dan kelola soal beserta pembahasannya.' },
  { id: 'schedule', label: 'Jadwal Asesmen', icon: '◷', title: 'Jadwal Asesmen', description: 'Tentukan kapan peserta boleh memulai asesmen.' },
  { id: 'reports', label: 'Laporan', icon: '▤', title: 'Laporan Asesmen', description: 'Pantau hasil siswa dan ekspor laporan PDF.' },
  { id: 'users', label: 'Pengguna', icon: '♙', title: 'Pengguna', description: 'Tambah akun secara manual atau import dari CSV/JSON.' },
];
const mobilePrimaryNavigation = navigation.filter((item) => ['overview', 'curriculum', 'questions', 'reports'].includes(item.id));
const mobileSecondaryNavigation = navigation.filter((item) => ['schedule', 'users'].includes(item.id));
const activeSection = ref<AdminSection>('overview');
const moreMenuOpen = ref(false);
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
const topicAccessDrafts = reactive<Record<number, { requires_token: boolean; token: string }>>({});
const topicAccessSavingId = ref<number | null>(null);
const topicAccessMessage = ref('');
const topicAccessMessageType = ref<'success' | 'error'>('success');
const search = ref('');
const difficultyFilter = ref<AdminQuestionListItem['difficulty'] | 'all'>('all');
const questionFormOpen = ref(false);
const difficultyFilters: Array<{ value: AdminQuestionListItem['difficulty'] | 'all'; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'easy', label: 'Mudah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'hard', label: 'Sulit' },
];
const questionTypeOptions = [
  { value: 'single_choice', label: 'Pilihan Ganda' },
  { value: 'multiple_response', label: 'Pilihan Ganda Kompleks' },
  { value: 'true_false', label: 'Benar / Salah' },
];
const difficultyOptions = [
  { value: 'easy', label: 'Mudah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'hard', label: 'Sulit' },
];
const importModeOptions = [
  { value: 'insert', label: 'Tambah baru saja' },
  { value: 'upsert', label: 'Tambah atau perbarui berdasarkan ID' },
];
const topicOptions = computed(() => topics.value.map((topic) => ({ value: topic.id, label: `${topic.subject_label} — ${topic.label}` })));
const filteredQuestions = computed(() => difficultyFilter.value === 'all'
  ? questions.value
  : questions.value.filter((question) => question.difficulty === difficultyFilter.value));
const editingId = ref<number | null>(null);
const importText = ref('');
const parsedImport = ref<unknown>(null);
const importMode = ref<'insert' | 'upsert'>('insert');
const importSummary = ref<ImportSummary | null>(null);
const confirmOpen = ref(false);
const confirmTitle = ref('Konfirmasi tindakan');
const confirmMessage = ref('Apakah kamu yakin ingin melanjutkan?');
const confirmLabel = ref('OK');
const pendingConfirmation = ref<(() => Promise<void>) | null>(null);
const scheduleStartAt = ref('');
const scheduleSaving = ref(false);
const scheduleMessage = ref('');
const scheduleMessageType = ref<'success' | 'error'>('success');

function selectSection(section: AdminSection) {
  activeSection.value = section;
  moreMenuOpen.value = false;
  errorMessage.value = '';
}

function syncTopicAccessDrafts(rows: AdminTopic[]) {
  for (const topic of rows) {
    topicAccessDrafts[topic.id] = { requires_token: topic.requires_token, token: '' };
  }
}

async function saveTopicAccess(topic: AdminTopic) {
  const draft = topicAccessDrafts[topic.id];
  if (!draft) return;
  topicAccessSavingId.value = topic.id;
  topicAccessMessage.value = '';
  try {
    const updated = await updateAdminTopicAccess(topic.id, {
      requires_token: draft.requires_token,
      ...(draft.token.trim() ? { token: draft.token.trim() } : {}),
    });
    topic.requires_token = updated.requires_token;
    topic.token_configured = updated.token_configured;
    draft.token = '';
    topicAccessMessageType.value = 'success';
    topicAccessMessage.value = `Akses token untuk ${topic.label} berhasil disimpan.`;
  } catch (error) {
    topicAccessMessageType.value = 'error';
    topicAccessMessage.value = error instanceof Error ? error.message : 'Gagal menyimpan pengaturan token topik.';
  } finally {
    topicAccessSavingId.value = null;
  }
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
  questionFormOpen.value = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeQuestionForm() {
  questionFormOpen.value = false;
}

function askConfirmation(title: string, message: string, action: () => Promise<void>, label = 'OK') {
  confirmTitle.value = title;
  confirmMessage.value = message;
  confirmLabel.value = label;
  pendingConfirmation.value = action;
  confirmOpen.value = true;
}

function closeConfirmation() {
  confirmOpen.value = false;
  pendingConfirmation.value = null;
}

async function runConfirmation() {
  const action = pendingConfirmation.value;
  closeConfirmation();
  if (action) await action();
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
    syncTopicAccessDrafts(topicRows);

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

function formatScheduleLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(date);
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
    questionFormOpen.value = true;
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
    questionFormOpen.value = false;
  } catch (error) {
    formMessageType.value = 'error';
    formMessage.value = error instanceof Error ? error.message : 'Gagal menyimpan soal.';
  } finally {
    saving.value = false;
  }
}

function removeQuestion() {
  const questionId = editingId.value;
  if (questionId === null) return;
  askConfirmation('Hapus soal?', `Soal #${questionId} akan dihapus. Tindakan ini tidak dapat dibatalkan.`, async () => {
    try {
      await deleteAdminQuestion(questionId);
      resetDraft();
      questionFormOpen.value = false;
      await loadQuestions();
    } catch (error) {
      formMessageType.value = 'error';
      formMessage.value = error instanceof Error ? error.message : 'Gagal menghapus soal.';
    }
  }, 'Hapus');
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

function applyImport() {
  if (parsedImport.value === null) return;
  askConfirmation('Terapkan import soal?', 'Soal yang sudah dipreview akan disimpan ke bank soal.', async () => {
    importing.value = true;
    try {
      importSummary.value = await importAdminQuestions(parsedImport.value, importMode.value, false);
      await loadQuestions();
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Gagal menerapkan import.';
    } finally {
      importing.value = false;
    }
  }, 'Terapkan');
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
.mobile-bottom-nav, .mobile-more-menu, .mobile-more-backdrop { display: none; }
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
.question-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.toolbar-search { display: flex; min-width: 0; flex: 1; gap: 8px; }
.toolbar-search .search-input { max-width: 420px; }
.question-filters { display: flex; flex-wrap: wrap; gap: 7px; margin: 14px 0 16px; }
.topic-access-panel { margin-bottom: 16px; padding: 18px; }
.topic-access-panel .panel-heading { margin-bottom: 4px; }
.topic-access-panel .panel-heading p { margin-top: 4px; color: #778899; font-size: .8rem; }
.topic-access-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.topic-access-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px; border: 1px solid #e1eaf4; border-radius: 11px; background: #fbfdff; }
.topic-access-info { min-width: 0; }.topic-access-info strong, .topic-access-info small { display: block; }.topic-access-info strong { color: #2c4f7a; font-size: .82rem; }.topic-access-info small { margin-top: 3px; color: #8497ae; font-size: .7rem; }
.topic-access-controls { display: grid; min-width: min(100%, 460px); grid-template-columns: auto minmax(150px, 1fr) auto; align-items: center; gap: 8px; }
.token-toggle { flex-direction: row; align-items: center; gap: 6px; color: #496482; font-size: .72rem; white-space: nowrap; }.token-toggle input { accent-color: #246bc5; }
.topic-access-controls input { min-width: 0; padding: 9px 10px; border: 1px solid #d4dde6; border-radius: 8px; color: #334b68; background: #fff; font: inherit; font-size: .78rem; }
.topic-access-controls .primary-btn { padding: 9px 12px; font-size: .74rem; }
.filter-chip { padding: 7px 12px; border: 1px solid #d7e2ef; border-radius: 999px; color: #617793; background: #fff; font: inherit; font-size: .75rem; font-weight: 700; cursor: pointer; }
.filter-chip:hover, .filter-chip.active { border-color: #2b72ce; color: #fff; background: #2b72ce; }
.search-input { max-width: 420px; }
.editor-grid { display: grid; grid-template-columns: minmax(260px, .8fr) minmax(360px, 1.2fr); gap: 20px; align-items: start; }
.question-list-panel { padding: 0; overflow: hidden; }
.question-list-panel .panel-heading, .form-panel .panel-heading, .import-panel .panel-heading { padding: 20px; border-bottom: 1px solid #e2e8f0; }
.panel-heading span { color: #778899; font-size: .9rem; }
.question-row { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; width: 100%; padding: 16px 20px; border: 0; border-bottom: 1px solid #edf1f5; background: #fff; color: #253f62; text-align: left; cursor: pointer; }
.question-row:hover, .question-row.active { background: #f0f4ff; }
.question-row-top, .question-row-bottom { display: flex; width: 100%; align-items: center; gap: 7px; }
.question-row-top { min-width: 0; }
.question-row-bottom { justify-content: space-between; }
.question-number { color: #2564ba; font-size: .75rem; font-weight: 800; }
.topic-badge, .difficulty-badge { display: inline-flex; max-width: 100%; overflow: hidden; align-items: center; padding: 4px 7px; border-radius: 999px; font-size: .67rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.topic-badge { color: #41688f; background: #edf5ff; }
.difficulty-badge { color: #687c96; background: #eef2f7; }
.difficulty-easy { color: #287b59; background: #e2f7ed; }.difficulty-medium { color: #9a691a; background: #fff3d9; }.difficulty-hard { color: #ae4d55; background: #ffebeb; }
.question-menu { margin-left: auto; color: #8ca0b8; font-size: 1.25rem; line-height: 1; }
.question-row > strong { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: #294b76; font-size: .87rem; line-height: 1.45; }
.row-id { overflow: hidden; color: #778899; font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }
.panel-empty { padding: 24px 20px; color: #778899; }
.form-panel form { display: flex; flex-direction: column; gap: 14px; padding: 20px; }
.form-heading-actions { display: flex; align-items: center; gap: 8px; }
.close-form-btn { display: none; width: 30px; height: 30px; border: 0; border-radius: 50%; color: #58718e; background: #edf3fa; font-size: 1.3rem; line-height: 1; cursor: pointer; }
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
  border: 1px solid #e0e9f3;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 7px 18px rgba(31, 74, 126, .05);
}

.schedule-hero { display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid #e6eef6; }
.schedule-icon { display: grid; width: 42px; height: 42px; flex: 0 0 auto; place-items: center; border-radius: 13px; color: #fff; background: linear-gradient(145deg, #2d82df, #2251b5); font-size: 1.4rem; box-shadow: 0 7px 15px rgba(35, 101, 199, .18); }
.schedule-eyebrow { color: #6d9fd4; font-size: .63rem; font-weight: 800; letter-spacing: .13em; }
.schedule-hero h2 { margin-top: 3px; color: #1e40af; font-size: 1.15rem; }
.schedule-hero p { margin-top: 3px; color: #72869f; font-size: .8rem; }
.schedule-hero .schedule-status { margin-left: auto; }
.schedule-time-card { display: flex; flex-direction: column; gap: 4px; padding: 15px; border-radius: 12px; background: #f1f7ff; }
.schedule-time-card span { color: #6f87a3; font-size: .72rem; font-weight: 700; }
.schedule-time-card strong { color: #245a9d; font-size: 1.05rem; }
.schedule-time-card small { color: #7d94ae; font-size: .72rem; }

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
  padding-top: 2px;
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
  .schedule-panel { padding: 16px; }
  .schedule-hero { align-items: flex-start; flex-wrap: wrap; }
  .schedule-hero .schedule-status { margin-left: 54px; margin-top: -5px; }
  .schedule-time-card strong { font-size: .95rem; line-height: 1.4; }
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
  .admin-view { padding: 18px 14px 100px; }
  .admin-layout { display: block; }
  .admin-sidebar { display: none; }
  .welcome-card { align-items: flex-start; flex-direction: column; padding: 22px; }
  .dashboard-header { align-items: flex-start; }
  .dashboard-header .secondary-btn { align-self: flex-start; }
  .question-toolbar { align-items: stretch; flex-direction: column; }
  .toolbar-search { width: 100%; }
  .toolbar-search .search-input { max-width: none; }
  .new-question-button { width: 100%; }
  .question-filters { margin-top: 12px; }
  .topic-access-panel { padding: 16px; }
  .topic-access-row { align-items: stretch; flex-direction: column; }
  .topic-access-controls { min-width: 0; grid-template-columns: 1fr; }
  .topic-access-controls .primary-btn { width: 100%; }
  .question-list-panel { min-height: 220px; }
  .form-panel { display: none; }
  .form-panel.open { position: fixed; z-index: 40; inset: 0; display: flex; overflow-y: auto; flex-direction: column; padding: 0; border-radius: 0; }
  .form-panel.open .panel-heading { position: sticky; z-index: 1; top: 0; padding: 16px 18px; background: #fff; }
  .form-panel.open form { padding: 18px; padding-bottom: 34px; }
  .form-panel.open .close-form-btn { display: block; }
  .mobile-more-backdrop { position: fixed; z-index: 29; inset: 0; display: block; background: rgba(18, 42, 76, .2); }
  .mobile-bottom-nav { position: fixed; z-index: 30; right: 10px; bottom: 10px; left: 10px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); padding: 8px 5px; border: 1px solid #d8e5f3; border-radius: 18px; background: rgba(255, 255, 255, .96); box-shadow: 0 12px 30px rgba(28, 66, 116, .2); backdrop-filter: blur(12px); }
  .mobile-nav-item { display: flex; min-width: 0; flex-direction: column; align-items: center; gap: 4px; padding: 7px 3px; border: 0; border-radius: 11px; color: #6b809d; background: transparent; font: inherit; font-size: .62rem; font-weight: 700; cursor: pointer; }
  .mobile-nav-item.active { color: #fff; background: linear-gradient(110deg, #2378db, #2251b5); box-shadow: 0 6px 14px rgba(35, 101, 199, .2); }
  .mobile-nav-icon { display: grid; min-height: 17px; place-items: center; font-size: .9rem; font-weight: 800; line-height: 1; }
  .mobile-more-menu { position: fixed; z-index: 31; right: 14px; bottom: 88px; left: 14px; display: block; padding: 14px; border: 1px solid #d8e5f3; border-radius: 16px; background: #fff; box-shadow: 0 14px 34px rgba(28, 66, 116, .2); }
  .mobile-more-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding: 0 4px 8px; border-bottom: 1px solid #edf2f7; color: #244978; font-size: .85rem; }
  .mobile-more-heading button { border: 0; color: #6b809d; background: transparent; font-size: 1.3rem; cursor: pointer; }
  .mobile-more-item { display: flex; width: 100%; align-items: center; gap: 10px; padding: 12px 8px; border: 0; border-radius: 9px; color: #55708f; background: transparent; font: inherit; font-size: .8rem; font-weight: 700; text-align: left; cursor: pointer; }
  .mobile-more-item:hover { background: #edf5ff; color: #1d5fc0; }
  .mobile-more-item > span:nth-child(2) { flex: 1; }
}
</style>
