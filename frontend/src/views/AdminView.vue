<template>
  <div :class="['admin-view', { 'editor-view': isEditorSession, 'teacher-workspace-view': isEditorSession && activeSection === 'overview' }]">
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
      <p>Gunakan akun admin atau akun guru yang sudah dibuat oleh admin.</p>
      <input v-model.trim="username" type="text" placeholder="Username admin/guru (kosongkan untuk ADMIN_PASSWORD)" autocomplete="username" autofocus />
      <input v-model="password" type="password" placeholder="Password" autocomplete="current-password" />
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
              <strong>{{ isEditorSession ? 'RUAS Guru' : 'RUAS Admin' }}</strong>
              <small>Ruang Asesmen</small>
            </div>
          </div>
          <p class="sidebar-label">MENU UTAMA</p>
          <nav class="admin-nav" aria-label="Navigasi admin">
            <button
              v-for="item in visibleNavigation"
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
            <div class="admin-header-actions">
              <span :class="['realtime-indicator', `realtime-${realtimeStatus}`]" :title="realtimeStatusLabel"><i></i>{{ realtimeStatusLabel }}</span>
              <button class="secondary-btn" @click="logout">Keluar</button>
            </div>
          </div>

          <TeacherWorkspaceHome
            v-if="isEditorSession && activeSection === 'overview'"
            :class-count="curriculum.classes.length"
            :assessment-type-count="curriculum.assessment_types.length"
            :subject-count="curriculum.subjects.length"
            :question-count="questionTotal"
            @create="handleTeacherWorkspaceAction"
          />

          <section v-else-if="activeSection === 'overview'" class="overview-section">
            <div class="welcome-card">
              <div>
                <span class="eyebrow">{{ isEditorSession ? 'DASHBOARD GURU' : 'DASHBOARD ADMIN' }}</span>
                <h2>{{ isEditorSession ? 'Selamat datang di Ruang Guru' : 'Selamat datang di Admin RUAS' }}</h2>
                <p>{{ isEditorSession ? 'Kelola siswa, topik, bank soal, dan jadwal sesuai penetapan Anda.' : 'Kelola struktur asesmen, bank soal, dan jadwal dari satu tempat.' }}</p>
              </div>
              <button class="primary-btn" type="button" @click="selectSection('questions')">Kelola Bank Soal</button>
            </div>
            <div class="stats-grid">
              <button v-if="isAdminSession" class="stat-card" type="button" @click="selectSection('curriculum')">
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

          <CurriculumPanel v-else-if="activeSection === 'curriculum'" :admin-session="adminSession" :initial-form="isEditorSession ? curriculumFocus : null" @topics-updated="loadData" />

          <ReportsPanel v-else-if="activeSection === 'reports'" :can-reset="isAdminSession" />

          <UsersPanel v-else-if="activeSection === 'users'" :admin-session="adminSession" />

          <TeacherRequestsPanel v-else-if="activeSection === 'teacher-requests'" />

          <section v-else-if="activeSection === 'schedule'" class="panel schedule-panel">
            <div class="schedule-hero">
              <span class="schedule-icon" aria-hidden="true">◷</span>
              <div><span class="schedule-eyebrow">AKSES TOPIK</span><h2>Jadwal Asesmen</h2><p>Atur jadwal secara terpisah untuk setiap topik.</p></div>
              <span class="schedule-status open">{{ scheduleRows.length }} topik</span>
            </div>

            <div class="schedule-layout">
              <form class="schedule-form schedule-editor-form" @submit.prevent="saveSchedule">
                <div class="panel-heading"><div><h3>Atur jadwal</h3><p>Pilih topik, lalu tentukan jendela pengerjaannya.</p></div></div>
                <label>Topik
                  <RuasSelect v-model="scheduleTopicId" :options="scheduleTopicOptions" placeholder="Pilih topik" aria-label="Topik untuk jadwal" />
                </label>
                <label>Waktu mulai
                  <input v-model="scheduleStartAt" type="datetime-local" />
                </label>
                <label>Waktu selesai <span class="label-optional">(opsional)</span>
                  <input v-model="scheduleEndAt" type="datetime-local" />
                </label>
                <label>Catatan <span class="label-optional">(opsional)</span>
                  <input v-model.trim="scheduleNotes" type="text" maxlength="255" placeholder="Contoh: Sesi pagi kelas XI" />
                </label>
                <label class="schedule-toggle"><input v-model="scheduleEnabled" type="checkbox" /> <span>Jadwal aktif</span></label>
                <div class="schedule-actions">
                  <button class="primary-btn" type="submit" :disabled="scheduleSaving || !scheduleTopicId">
                    {{ scheduleSaving ? 'Menyimpan...' : 'Simpan Jadwal' }}
                  </button>
                  <button class="secondary-btn" type="button" :disabled="scheduleSaving || !scheduleTopicId" @click="openScheduleNow">Buka Sekarang</button>
                </div>
              </form>

              <div class="schedule-list-card">
                <div class="panel-heading"><div><h3>Jadwal per topik</h3><p>Urutan status: Sedang Berlangsung, Akan Datang, lalu Sudah Berakhir.</p></div></div>
                <div v-if="scheduleRows.length === 0" class="schedule-empty">Belum ada jadwal khusus. Peserta dapat mulai segera.</div>
                <template v-for="group in scheduleGroups" :key="group.key">
                  <div v-if="group.rows.length" class="schedule-group">
                    <h4>{{ group.label }} <span>{{ group.rows.length }}</span></h4>
                    <button v-for="row in group.rows" :key="row.topic_id ?? row.id ?? 'schedule'" type="button" class="schedule-row" @click="editSchedule(row)">
                      <span class="schedule-row-main"><strong>{{ row.topic_label }}</strong><small>{{ row.subject_label || 'Tanpa mata pelajaran' }} · {{ row.notes || 'Tanpa catatan' }}</small></span>
                      <span :class="['schedule-row-state', `state-${row.state}`]">{{ scheduleStateLabel(row.state) }}</span>
                      <span class="schedule-row-time">{{ formatScheduleWindow(row) }}</span>
                    </button>
                  </div>
                </template>
              </div>
            </div>
            <p class="field-hint schedule-hint">Kosongkan waktu mulai lalu simpan untuk membuka topik segera. Matikan “Jadwal aktif” untuk menutup sementara.</p>
            <p v-if="scheduleMessage" :class="scheduleMessageType === 'error' ? 'error-text' : 'success-text'">{{ scheduleMessage }}</p>
          </section>

          <template v-else>
          <div class="question-toolbar">
            <div class="toolbar-search">
              <input v-model="search" class="search-input" placeholder="Cari soal, topik, atau external ID..." />
              <button class="secondary-btn" type="button" :disabled="loading" @click="runQuestionSearch">Cari</button>
            </div>
            <button class="secondary-btn import-question-button" type="button" @click="openImportModal">Import JSON</button>
            <button class="primary-btn new-question-button" type="button" @click="startNew">＋ Soal Baru</button>
          </div>

          <div class="question-filters" aria-label="Filter bank soal">
            <button v-for="filter in difficultyFilters" :key="filter.value" type="button" :class="['filter-chip', { active: difficultyFilter === filter.value }]" @click="difficultyFilter = filter.value">{{ filter.label }}</button>
            <RuasSelect v-model="questionTypeFilter" :options="questionTypeFilterOptions" aria-label="Filter tipe soal" />
            <RuasSelect v-model="questionStatusFilter" :options="questionStatusFilterOptions" aria-label="Filter status soal" />
            <RuasSelect v-model="questionTopicFilter" class="topic-filter-select" :options="questionTopicFilterOptions" searchable search-placeholder="Cari topik atau mata pelajaran..." aria-label="Filter topik soal" />
          </div>

          <details class="panel topic-access-panel">
            <summary class="topic-access-summary"><span><strong>Akses Topik</strong><small>Semua topik menggunakan token</small></span><span class="topic-access-count">{{ topics.length }} topik</span></summary>
            <div class="topic-access-content">
              <p class="field-hint">Token lama tidak dapat ditampilkan kembali karena disimpan sebagai hash. Masukkan token baru jika ingin menggantinya; token baru akan ditampilkan sekali setelah disimpan.</p>
              <input v-model="topicAccessSearch" class="topic-access-search" type="search" placeholder="Cari topik atau mata pelajaran..." aria-label="Cari akses topik" />
              <p v-if="topicAccessMessage" :class="topicAccessMessageType === 'error' ? 'error-text' : 'success-text'">{{ topicAccessMessage }}</p>
              <div class="topic-access-list">
                <article v-for="topic in filteredTopicAccessTopics" :key="topic.id" class="topic-access-row">
                  <div class="topic-access-info"><strong>{{ topic.label }}</strong><small>{{ topic.subject_label }} · {{ topic.token_configured ? 'Token aktif · tersimpan aman' : 'Token belum diatur' }}</small></div>
                  <div class="topic-access-controls">
                    <input v-model="topicAccessDrafts[topic.id].token" type="text" autocomplete="off" :placeholder="topic.token_configured ? 'Ganti token (opsional)' : 'Masukkan token wajib'" @keydown.enter="saveTopicAccess(topic)" />
                    <button class="primary-btn" type="button" :disabled="topicAccessSavingId === topic.id" @click="saveTopicAccess(topic)">{{ topicAccessSavingId === topic.id ? 'Menyimpan...' : 'Simpan' }}</button>
                  </div>
                  <div v-if="revealedTopicTokens[topic.id]" class="topic-access-reveal"><span>Token baru, tampil sekali:</span><code>{{ revealedTopicTokens[topic.id] }}</code><button type="button" @click="copyTopicToken(topic.id)">Salin</button></div>
                </article>
                <p v-if="filteredTopicAccessTopics.length === 0" class="panel-empty">Topik akses tidak ditemukan.</p>
              </div>
            </div>
          </details>

          <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

          <section class="editor-grid">
        <div class="panel question-list-panel">
          <div class="panel-heading">
            <h2>Daftar Soal</h2>
            <span>{{ questionTotal }} soal</span>
          </div>

          <div v-if="loading" class="panel-empty">Memuat...</div>
          <div v-else-if="questions.length === 0" class="panel-empty">Belum ada soal yang cocok.</div>
          <button
            v-for="item in questions"
            :key="item.id"
            class="question-row"
            :class="{ active: editingId === item.id }"
            type="button"
            @click="editQuestion(item.id)"
          >
            <span class="question-row-top"><span class="question-number">#{{ item.id }}</span><span class="topic-badge">{{ item.topic_labels.length > 1 ? `${item.topic_labels.length} topik` : item.topic_label }}</span><span class="question-type-badge">{{ questionTypeLabel(item.type) }}</span><span :class="['question-owner-badge', item.creator_role === 'editor' ? 'editor-owner' : 'admin-owner']">{{ item.creator_role === 'editor' ? `Editor · ${item.creator_display_name || item.created_by}` : 'Admin / Sistem' }}</span><span v-if="item.archived_at" class="question-status-badge">Diarsipkan</span><span class="question-menu" aria-hidden="true">⋮</span></span>
            <strong><MathText :text="item.question_text" /></strong>
            <span class="question-row-bottom"><span :class="['difficulty-badge', `difficulty-${item.difficulty}`]">{{ difficultyLabel(item.difficulty) }}</span><span v-if="item.external_id" class="row-id">{{ item.external_id }}</span></span>
          </button>
          <div v-if="questionTotal > 0" class="question-pagination">
            <span class="pagination-summary">Menampilkan {{ questionRangeStart }}–{{ questionRangeEnd }} dari {{ questionTotal }}</span>
            <div class="pagination-controls">
              <button type="button" class="pagination-btn" :disabled="questionPage <= 1 || loading" @click="goToQuestionPage(questionPage - 1)">‹</button>
              <span>Halaman {{ questionPage }} / {{ questionTotalPages }}</span>
              <button type="button" class="pagination-btn" :disabled="questionPage >= questionTotalPages || loading" @click="goToQuestionPage(questionPage + 1)">›</button>
              <RuasSelect v-model="questionPageSize" :options="questionPageSizeOptions" aria-label="Jumlah soal per halaman" />
            </div>
          </div>
        </div>

        <div class="panel form-panel" :class="{ open: questionFormOpen }">
          <div class="panel-heading">
            <h2>{{ editingId === null ? 'Soal Baru' : `Edit Soal #${editingId}` }}</h2>
            <div class="form-heading-actions"><button v-if="editingId !== null && canManageEditingQuestion" type="button" :class="editingArchivedAt ? 'restore-link' : 'archive-link'" @click="toggleQuestionArchive">{{ editingArchivedAt ? 'Pulihkan' : 'Arsipkan' }}</button><button v-if="editingId !== null && canManageEditingQuestion" type="button" class="danger-link" @click="removeQuestion">Hapus</button><button class="close-form-btn" type="button" aria-label="Tutup form soal" @click="closeQuestionForm">×</button></div>
          </div>

          <form @submit.prevent="saveQuestion">
            <p v-if="questionReadOnly" class="question-readonly-note">Soal ini dibuat oleh Admin dan hanya dapat dilihat oleh Editor.</p>
            <fieldset :disabled="questionReadOnly" class="question-readonly-fieldset">
            <label>Topik
              <RuasSelect v-model="draft.topic_id" :options="topicOptions" placeholder="Pilih topik" aria-label="Topik soal" />
              <span v-if="topics.length === 0" class="question-topic-empty">Belum ada topik. <button type="button" @click="selectSection('curriculum')">Buat topik terlebih dahulu</button> agar soal dapat disimpan.</span>
            </label>
            <fieldset class="topic-mapping-fieldset">
              <legend>Paket/topik yang menyertakan soal</legend>
              <p class="field-hint">Satu soal dapat digunakan di beberapa topik. Topik utama di atas selalu disertakan.</p>
              <div class="topic-mapping-grid">
                <label v-for="topic in topics" :key="topic.id" :class="['topic-mapping-option', { selected: draft.topic_ids.includes(topic.id) }]">
                  <input v-model="draft.topic_ids" class="topic-mapping-checkbox" type="checkbox" :value="topic.id" />
                  <span class="topic-mapping-icon" aria-hidden="true">▦</span>
                  <span class="topic-mapping-copy"><strong>{{ topic.label }}</strong><small>{{ topic.subject_label || 'Tanpa mata pelajaran' }}</small></span>
                  <span class="topic-mapping-check" aria-hidden="true">✓</span>
                </label>
              </div>
            </fieldset>

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

            <fieldset class="question-media-fieldset">
              <legend>Gambar pertanyaan</legend>
              <p class="field-hint">Simpan soal terlebih dahulu sebelum mengunggah gambar. JPG, PNG, WEBP, atau GIF maksimal 10 MB akan dikonversi ke WebP kualitas 80.</p>
              <QuestionMediaGallery :media="questionMedia" />
              <div v-for="media in questionMedia" :key="media.id" class="question-media-admin-row">
                <span>{{ media.alt_text }}</span>
                <button type="button" class="remove-option" @click="removeQuestionMedia(media.id)">Hapus</button>
              </div>
              <div v-if="editingId !== null" class="media-upload-fields">
                <input v-model="mediaAltText" placeholder="Teks alternatif gambar" maxlength="255" />
                <input v-model="mediaCaption" placeholder="Keterangan gambar (opsional)" maxlength="1000" />
                <label class="media-file-picker">
                  <span>{{ mediaUploading ? 'Mengunggah...' : 'Pilih gambar' }}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" :disabled="mediaUploading" @change="uploadQuestionImage" />
                </label>
              </div>
              <p v-else class="field-hint">Setelah soal disimpan, buka kembali soal ini untuk menambahkan gambar.</p>
            </fieldset>

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
            </fieldset>
          </form>
        </div>
          </section>

          <section class="panel import-panel" :class="{ open: importFormOpen }">
        <div class="panel-heading">
          <div>
            <h2>Import JSON</h2>
            <p>Terima array soal atau object seed dengan properti <code>questions</code>.</p>
          </div>
          <div class="form-heading-actions"><RuasSelect v-model="importMode" :options="importModeOptions" aria-label="Mode import soal" /><button class="close-form-btn" type="button" aria-label="Tutup import JSON" @click="closeImportModal">×</button></div>
        </div>
        <label class="import-file-picker"><span>Unggah file JSON</span><input type="file" accept=".json,application/json" @change="handleImportFile" /></label>
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

      <nav class="mobile-bottom-nav no-print" aria-label="Navigasi admin mobile">
        <button
          v-for="item in visibleMobilePrimaryNavigation"
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
        <button v-for="item in visibleMobileSecondaryNavigation" :key="item.id" type="button" class="mobile-more-item" @click="selectSection(item.id)">
          <span class="mobile-nav-icon" aria-hidden="true">{{ item.icon }}</span><span>{{ item.label }}</span><span aria-hidden="true">›</span>
        </button>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import MathText from '@/components/MathText.vue';
import QuestionMediaGallery from '@/components/QuestionMediaGallery.vue';
import CurriculumPanel from '@/components/CurriculumPanel.vue';
import ReportsPanel from '@/components/ReportsPanel.vue';
import RuasSelect from '@/components/RuasSelect.vue';
import UsersPanel from '@/components/UsersPanel.vue';
import TeacherRequestsPanel from '@/components/TeacherRequestsPanel.vue';
import TeacherWorkspaceHome from '@/components/TeacherWorkspaceHome.vue';
import {
  adminLogin,
  createAdminQuestion,
  deleteAdminQuestion,
  fetchAdminAuthStatus,
  fetchAdminQuestion,
  fetchAdminQuestions,
  fetchAdminSchedule,
  fetchAdminTopics,
  fetchAdminCurriculum,
  deleteAdminQuestionMedia,
  importAdminQuestions,
  setAdminQuestionArchived,
  uploadAdminQuestionMedia,
  updateAdminTopicAccess,
  updateAdminQuestion,
  updateAdminSchedule,
} from '@/api/client';
import type { AdminQuestionInput, AdminQuestionListItem, AdminTopic, AssessmentSchedule, CurriculumData, ImportSummary, QuestionMedia } from '@/types';
import type { AdminSession } from '@/types';
import { connectAdminRealtime, dispatchAdminRealtimeEvent, type AdminRealtimeEvent, type AdminRealtimeStatus } from '@/lib/admin-realtime';

const router = useRouter();
type AdminSection = 'overview' | 'curriculum' | 'questions' | 'schedule' | 'reports' | 'users' | 'teacher-requests';
type TeacherWorkspaceAction = 'class' | 'assessment-type' | 'subject' | 'question';
const navigation: Array<{ id: AdminSection; label: string; icon: string; title: string; description: string }> = [
  { id: 'overview', label: 'Ringkasan', icon: '⌂', title: 'Ringkasan', description: 'Pantau isi dan status asesmen RUAS.' },
  { id: 'curriculum', label: 'Struktur Asesmen', icon: '▦', title: 'Struktur Asesmen', description: 'Atur kelas, jenis asesmen, dan mata pelajaran.' },
  { id: 'questions', label: 'Bank Soal', icon: '?', title: 'Bank Soal', description: 'Buat, cari, dan kelola soal beserta pembahasannya.' },
  { id: 'schedule', label: 'Jadwal Asesmen', icon: '◷', title: 'Jadwal Asesmen', description: 'Tentukan kapan peserta boleh memulai asesmen.' },
  { id: 'reports', label: 'Laporan', icon: '▤', title: 'Laporan Asesmen', description: 'Pantau hasil siswa dan ekspor laporan PDF.' },
  { id: 'users', label: 'Pengguna', icon: '♙', title: 'Pengguna', description: 'Tambah akun secara manual atau import dari CSV/JSON.' },
  { id: 'teacher-requests', label: 'Pengajuan Guru', icon: '✦', title: 'Pengajuan Guru', description: 'Tinjau permintaan akses Editor dari guru.' },
];
const adminSession = ref<AdminSession | null>(null);
const isAdminSession = computed(() => adminSession.value?.role === 'admin');
const isEditorSession = computed(() => adminSession.value?.role === 'editor');
const visibleNavigation = computed(() => isAdminSession.value ? navigation : navigation.filter((item) => item.id !== 'teacher-requests'));
const visibleMobilePrimaryNavigation = computed(() => visibleNavigation.value.filter((item) => ['overview', 'curriculum', 'questions', 'reports'].includes(item.id)));
const visibleMobileSecondaryNavigation = computed(() => visibleNavigation.value.filter((item) => ['schedule', 'users', 'teacher-requests'].includes(item.id)));
const activeSection = ref<AdminSection>('overview');
const curriculumFocus = ref<'class' | 'type' | 'subject' | null>(null);
const moreMenuOpen = ref(false);
const currentSection = computed(() => navigation.find((item) => item.id === activeSection.value) ?? navigation[0]);
const currentSectionTitle = computed(() => currentSection.value.title);
const currentSectionDescription = computed(() => currentSection.value.description);
const adminEnabled = ref(false);
const authLoading = ref(true);
const isAuthenticated = ref(Boolean(sessionStorage.getItem('admin_token')));
const username = ref('');
const password = ref('');
const loading = ref(false);
const saving = ref(false);
const importing = ref(false);
const realtimeStatus = ref<AdminRealtimeStatus>('disconnected');
let realtimeCleanup: (() => void) | null = null;
const errorMessage = ref('');
const formMessage = ref('');
const formMessageType = ref<'success' | 'error'>('success');
const questions = ref<AdminQuestionListItem[]>([]);
const topics = ref<AdminTopic[]>([]);
const curriculum = ref<CurriculumData>({ classes: [], assessment_types: [], subjects: [] });
const topicAccessDrafts = reactive<Record<number, { token: string }>>({});
const revealedTopicTokens = reactive<Record<number, string>>({});
const topicAccessSavingId = ref<number | null>(null);
const topicAccessMessage = ref('');
const topicAccessMessageType = ref<'success' | 'error'>('success');
const topicAccessSearch = ref('');
const search = ref('');
const difficultyFilter = ref<AdminQuestionListItem['difficulty'] | 'all'>('all');
const questionTypeFilter = ref<AdminQuestionListItem['type'] | 'all'>('all');
const questionStatusFilter = ref<'active' | 'archived' | 'all'>('active');
const questionTopicFilter = ref<number | null>(null);
const questionPage = ref(1);
const questionPageSize = ref(25);
const questionTotal = ref(0);
const questionTotalPages = ref(1);
const questionFormOpen = ref(false);
const importFormOpen = ref(false);
const questionMedia = ref<QuestionMedia[]>([]);
const mediaAltText = ref('');
const mediaCaption = ref('');
const mediaUploading = ref(false);
let questionSearchTimer: ReturnType<typeof setTimeout> | null = null;
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
function topicScopeLabel(topic: AdminTopic) {
  return topic.class_labels.length > 0 ? topic.class_labels.join(', ') : 'Semua kelas';
}
const topicOptions = computed(() => topics.value.map((topic) => ({ value: topic.id, label: `${topic.subject_label} — ${topic.label} · ${topicScopeLabel(topic)}` })));
const filteredTopicAccessTopics = computed(() => {
  const query = topicAccessSearch.value.trim().toLocaleLowerCase('id-ID');
  if (!query) return topics.value;
  return topics.value.filter((topic) => `${topic.label} ${topic.subject_label}`.toLocaleLowerCase('id-ID').includes(query));
});
const questionTypeFilterOptions = [{ value: 'all', label: 'Semua tipe soal' }, ...questionTypeOptions];
const questionStatusFilterOptions = [
  { value: 'active', label: 'Soal aktif' },
  { value: 'archived', label: 'Soal diarsipkan' },
  { value: 'all', label: 'Semua status' },
];
const questionTopicFilterOptions = computed(() => [{ value: null, label: 'Semua topik' }, ...topics.value.map((topic) => ({ value: topic.id, label: `${topic.subject_label} · ${topic.label} · ${topicScopeLabel(topic)}` }))]);
const questionPageSizeOptions = [25, 50, 100].map((value) => ({ value, label: `${value} soal` }));
const questionRangeStart = computed(() => questionTotal.value === 0 ? 0 : (questionPage.value - 1) * questionPageSize.value + 1);
const questionRangeEnd = computed(() => Math.min(questionTotal.value, questionPage.value * questionPageSize.value));
const editingId = ref<number | null>(null);
const editingArchivedAt = ref<string | null>(null);
const editingQuestionCreatedBy = ref<string | null>(null);
const canManageEditingQuestion = computed(() => editingId.value === null || isAdminSession.value || editingQuestionCreatedBy.value === adminSession.value?.username);
const questionReadOnly = computed(() => editingId.value !== null && !canManageEditingQuestion.value);
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
const scheduleEndAt = ref('');
const scheduleEnabled = ref(true);
const scheduleNotes = ref('');
const scheduleTopicId = ref<number | null>(null);
const scheduleRows = ref<AssessmentSchedule[]>([]);
const scheduleSaving = ref(false);
const scheduleMessage = ref('');
const scheduleMessageType = ref<'success' | 'error'>('success');
const scheduleTopicOptions = computed(() => topics.value.map((item) => ({ value: item.id, label: `${item.subject_label} — ${item.label} · ${topicScopeLabel(item)}` })));
const scheduleGroups = computed(() => [
  { key: 'open', label: 'Sedang Berlangsung', rows: scheduleRows.value.filter((row) => row.state === 'open') },
  { key: 'upcoming', label: 'Akan Datang', rows: scheduleRows.value.filter((row) => row.state === 'upcoming') },
  { key: 'ended', label: 'Sudah Berakhir', rows: scheduleRows.value.filter((row) => row.state === 'ended' || row.state === 'disabled') },
]);

watch(search, () => {
  if (questionSearchTimer) clearTimeout(questionSearchTimer);
  questionSearchTimer = setTimeout(() => {
    questionPage.value = 1;
    void loadQuestions();
  }, 350);
});
watch([difficultyFilter, questionTypeFilter, questionStatusFilter, questionTopicFilter, questionPageSize], () => {
  questionPage.value = 1;
  void loadQuestions();
});

function selectSection(section: AdminSection) {
  activeSection.value = section;
  moreMenuOpen.value = false;
  errorMessage.value = '';
}

function handleTeacherWorkspaceAction(action: TeacherWorkspaceAction) {
  if (action === 'question') {
    startNew();
    selectSection('questions');
    return;
  }
  curriculumFocus.value = action === 'assessment-type' ? 'type' : action;
  selectSection('curriculum');
}

function syncTopicAccessDrafts(rows: AdminTopic[]) {
  for (const topic of rows) {
    topicAccessDrafts[topic.id] = { token: '' };
  }
}

async function saveTopicAccess(topic: AdminTopic) {
  const draft = topicAccessDrafts[topic.id];
  if (!draft) return;
  if (!topic.token_configured && !draft.token.trim()) {
    topicAccessMessageType.value = 'error';
    topicAccessMessage.value = `Masukkan token untuk ${topic.label} terlebih dahulu.`;
    return;
  }
  topicAccessSavingId.value = topic.id;
  topicAccessMessage.value = '';
  delete revealedTopicTokens[topic.id];
  try {
    const updated = await updateAdminTopicAccess(topic.id, {
      ...(draft.token.trim() ? { token: draft.token.trim() } : {}),
    });
    topic.requires_token = true;
    topic.token_configured = updated.token_configured;
    if (updated.token) revealedTopicTokens[topic.id] = updated.token;
    draft.token = '';
    topicAccessMessageType.value = 'success';
    topicAccessMessage.value = updated.token
      ? `Token ${topic.label} berhasil disimpan dan ditampilkan sekali.`
      : `Akses token ${topic.label} tetap aktif.`;
  } catch (error) {
    topicAccessMessageType.value = 'error';
    topicAccessMessage.value = error instanceof Error ? error.message : 'Gagal menyimpan pengaturan token topik.';
  } finally {
    topicAccessSavingId.value = null;
  }
}

async function copyTopicToken(topicId: number) {
  const token = revealedTopicTokens[topicId];
  if (!token) return;
  try {
    await navigator.clipboard.writeText(token);
    topicAccessMessageType.value = 'success';
    topicAccessMessage.value = 'Token berhasil disalin.';
  } catch {
    topicAccessMessageType.value = 'error';
    topicAccessMessage.value = 'Token tidak dapat disalin otomatis. Silakan salin secara manual.';
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
    topic_ids: [],
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
  draft.topic_ids = [...(input.topic_ids?.length ? input.topic_ids : input.topic_id > 0 ? [input.topic_id] : [])];
  draft.options = input.options.map((option) => ({ ...option }));
}

function resetDraft() {
  setDraft(createDraft());
  questionMedia.value = [];
  mediaAltText.value = '';
  mediaCaption.value = '';
  editingId.value = null;
  editingArchivedAt.value = null;
  editingQuestionCreatedBy.value = null;
  formMessage.value = '';
}

function startNew() {
  resetDraft();
  questionFormOpen.value = true;
}

function closeQuestionForm() {
  questionFormOpen.value = false;
}

function openImportModal() {
  importFormOpen.value = true;
}

function closeImportModal() {
  importFormOpen.value = false;
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
    adminSession.value = await adminLogin(username.value, password.value);
    username.value = '';
    password.value = '';
    isAuthenticated.value = true;
    await loadData();
    startRealtime();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal login admin.';
  } finally {
    loading.value = false;
  }
}

function logout() {
  stopRealtime();
  sessionStorage.removeItem('admin_token');
  adminSession.value = null;
  isAuthenticated.value = false;
  router.replace('/admin');
}

const realtimeStatusLabel = computed(() => ({ connecting: 'Menghubungkan live', connected: 'Live aktif', disconnected: 'Live terputus' }[realtimeStatus.value]));

function stopRealtime() {
  realtimeCleanup?.();
  realtimeCleanup = null;
}

function startRealtime() {
  stopRealtime();
  realtimeCleanup = connectAdminRealtime((event) => void handleRealtimeEvent(event), (status) => { realtimeStatus.value = status; });
}

async function refreshSchedules() {
  try {
    scheduleRows.value = await fetchAdminSchedule();
    loadScheduleDraft(scheduleRows.value.find((row) => row.topic_id === scheduleTopicId.value) ?? null);
  } catch {
    // Keep the current schedule visible if a transient refresh fails.
  }
}

async function handleRealtimeEvent(event: AdminRealtimeEvent) {
  dispatchAdminRealtimeEvent(event);
  if (event.resource === 'questions' || event.resource === 'topics' || event.resource === 'curriculum') await loadData();
  if (event.resource === 'schedule') await refreshSchedules();
}

async function loadQuestions() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const result = await fetchAdminQuestions({
      search: search.value.trim() || undefined,
      topic_id: questionTopicFilter.value ?? undefined,
      type: questionTypeFilter.value === 'all' ? undefined : questionTypeFilter.value,
      difficulty: difficultyFilter.value === 'all' ? undefined : difficultyFilter.value,
      status: questionStatusFilter.value,
      page: questionPage.value,
      page_size: questionPageSize.value,
    });
    questions.value = result.questions;
    questionPage.value = result.page;
    questionPageSize.value = result.page_size;
    questionTotal.value = result.total;
    questionTotalPages.value = result.total_pages;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat soal.';
  } finally {
    loading.value = false;
  }
}

function runQuestionSearch() {
  if (questionSearchTimer) clearTimeout(questionSearchTimer);
  questionPage.value = 1;
  void loadQuestions();
}

function goToQuestionPage(page: number) {
  if (page < 1 || page > questionTotalPages.value || page === questionPage.value) return;
  questionPage.value = page;
  void loadQuestions();
}

async function loadData() {
  try {
    const [questionRows, topicRows, schedules, curriculumData] = await Promise.all([
      fetchAdminQuestions(),
      fetchAdminTopics(),
      fetchAdminSchedule(),
      fetchAdminCurriculum(),
    ]);
    questions.value = questionRows.questions;
    questionPage.value = questionRows.page;
    questionPageSize.value = questionRows.page_size;
    questionTotal.value = questionRows.total;
    questionTotalPages.value = questionRows.total_pages;
    topics.value = topicRows;
    curriculum.value = curriculumData;
    syncTopicAccessDrafts(topicRows);
    scheduleRows.value = schedules;
    const selectedId = scheduleTopicId.value ?? topics.value[0]?.id ?? null;
    scheduleTopicId.value = selectedId;
    loadScheduleDraft(scheduleRows.value.find((row) => row.topic_id === selectedId) ?? null);
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

function loadScheduleDraft(row: AssessmentSchedule | null) {
  scheduleStartAt.value = toDateTimeLocal(row?.start_at ?? null);
  scheduleEndAt.value = toDateTimeLocal(row?.end_at ?? null);
  scheduleEnabled.value = row?.enabled ?? true;
  scheduleNotes.value = row?.notes ?? '';
}

function editSchedule(row: AssessmentSchedule) {
  scheduleTopicId.value = row.topic_id;
  loadScheduleDraft(row);
  scheduleMessage.value = '';
}

function scheduleStateLabel(state: AssessmentSchedule['state']) {
  return { open: 'Terbuka', upcoming: 'Menunggu', ended: 'Berakhir', disabled: 'Nonaktif' }[state];
}

function formatScheduleWindow(row: AssessmentSchedule) {
  if (!row.start_at && !row.end_at) return 'Terbuka segera';
  const start = row.start_at ? formatScheduleLabel(row.start_at) : 'Segera';
  const end = row.end_at ? formatScheduleLabel(row.end_at) : 'tanpa batas akhir';
  return `${start} · ${end}`;
}

async function saveSchedule() {
  if (!scheduleTopicId.value) {
    scheduleMessageType.value = 'error';
    scheduleMessage.value = 'Pilih topik terlebih dahulu.';
    return;
  }
  let startAt: string | null = null;
  let endAt: string | null = null;
  if (scheduleStartAt.value) {
    const date = new Date(scheduleStartAt.value);
    if (Number.isNaN(date.getTime())) {
      scheduleMessageType.value = 'error';
      scheduleMessage.value = 'Waktu mulai tidak valid.';
      return;
    }
    startAt = date.toISOString();
  }
  if (scheduleEndAt.value) {
    const date = new Date(scheduleEndAt.value);
    if (Number.isNaN(date.getTime())) {
      scheduleMessageType.value = 'error';
      scheduleMessage.value = 'Waktu selesai tidak valid.';
      return;
    }
    endAt = date.toISOString();
  }
  if (startAt && endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    scheduleMessageType.value = 'error';
    scheduleMessage.value = 'Waktu selesai harus setelah waktu mulai.';
    return;
  }

  scheduleSaving.value = true;
  scheduleMessage.value = '';
  try {
    await updateAdminSchedule(scheduleTopicId.value, { start_at: startAt, end_at: endAt, enabled: scheduleEnabled.value, notes: scheduleNotes.value || null });
    scheduleRows.value = await fetchAdminSchedule();
    loadScheduleDraft(scheduleRows.value.find((row) => row.topic_id === scheduleTopicId.value) ?? null);
    scheduleMessageType.value = 'success';
    scheduleMessage.value = startAt ? 'Jadwal topik berhasil disimpan.' : 'Topik dibuka segera.';
  } catch (error) {
    scheduleMessageType.value = 'error';
    scheduleMessage.value = error instanceof Error ? error.message : 'Gagal menyimpan jadwal.';
  } finally {
    scheduleSaving.value = false;
  }
}

async function openScheduleNow() {
  scheduleStartAt.value = '';
  scheduleEndAt.value = '';
  scheduleEnabled.value = true;
  await saveSchedule();
}

async function editQuestion(id: number) {
  try {
    const question = await fetchAdminQuestion(id);
    setDraft({
      topic_id: question.topic_id,
      topic_ids: question.topic_ids,
      type: question.type,
      difficulty: question.difficulty,
      external_id: question.external_id,
      question_text: question.question_text,
      explanation_text: question.explanation_text,
      options: question.options,
    });
    editingArchivedAt.value = question.archived_at;
    editingQuestionCreatedBy.value = question.created_by;
    questionMedia.value = question.media ?? [];
    mediaAltText.value = '';
    mediaCaption.value = '';
    editingId.value = id;
    formMessage.value = '';
    questionFormOpen.value = true;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat soal.';
  }
}

function toggleQuestionArchive() {
  if (editingId.value === null) return;
  const archived = editingArchivedAt.value === null;
  askConfirmation(
    archived ? 'Arsipkan soal?' : 'Pulihkan soal?',
    archived ? 'Soal tidak akan dipakai dalam ujian baru, tetapi riwayat asesmen tetap aman.' : 'Soal akan kembali tersedia untuk paket dan ujian baru.',
    async () => {
      if (editingId.value === null) return;
      try {
        await setAdminQuestionArchived(editingId.value, archived);
        editingArchivedAt.value = archived ? new Date().toISOString() : null;
        formMessageType.value = 'success';
        formMessage.value = archived ? 'Soal berhasil diarsipkan.' : 'Soal berhasil dipulihkan.';
        await loadQuestions();
        if ((archived && questionStatusFilter.value === 'active') || (!archived && questionStatusFilter.value === 'archived')) closeQuestionForm();
      } catch (error) {
        formMessageType.value = 'error';
        formMessage.value = error instanceof Error ? error.message : 'Gagal mengubah status arsip soal.';
      }
    },
    archived ? 'Arsipkan' : 'Pulihkan',
  );
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

async function uploadQuestionImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || editingId.value === null) return;

  mediaUploading.value = true;
  try {
    const media = await uploadAdminQuestionMedia(editingId.value, file, mediaAltText.value, mediaCaption.value);
    questionMedia.value.push(media);
    mediaAltText.value = '';
    mediaCaption.value = '';
    formMessageType.value = 'success';
    formMessage.value = 'Gambar berhasil diunggah.';
  } catch (error) {
    formMessageType.value = 'error';
    formMessage.value = error instanceof Error ? error.message : 'Gagal mengunggah gambar.';
  } finally {
    mediaUploading.value = false;
  }
}

function removeQuestionMedia(mediaId: number) {
  if (editingId.value === null) return;
  askConfirmation('Hapus gambar?', 'Gambar ini akan dihapus dari soal.', async () => {
    try {
      await deleteAdminQuestionMedia(editingId.value as number, mediaId);
      questionMedia.value = questionMedia.value.filter((media) => media.id !== mediaId);
      formMessageType.value = 'success';
      formMessage.value = 'Gambar berhasil dihapus.';
    } catch (error) {
      formMessageType.value = 'error';
      formMessage.value = error instanceof Error ? error.message : 'Gagal menghapus gambar.';
    }
  }, 'Hapus');
}

async function saveQuestion() {
  saving.value = true;
  formMessage.value = '';
  try {
    if (draft.topic_id > 0 && !draft.topic_ids.includes(draft.topic_id)) draft.topic_ids.unshift(draft.topic_id);
    if (editingId.value === null) {
      const id = await createAdminQuestion(draft);
      resetDraft();
      formMessage.value = `Soal #${id} berhasil dibuat.`;
    } else {
      await updateAdminQuestion(editingId.value, draft);
      formMessage.value = 'Soal berhasil diperbarui.';
    }
    formMessageType.value = 'success';
    questionPage.value = 1;
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
      questionPage.value = 1;
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

function questionTypeLabel(value: AdminQuestionListItem['type']) {
  return { single_choice: 'Pilihan ganda', multiple_response: 'Multi jawaban', true_false: 'Benar / Salah' }[value];
}

function parseImportText(): unknown | null {
  try {
    return JSON.parse(importText.value);
  } catch {
    errorMessage.value = 'JSON tidak valid. Periksa koma, kurung, dan tanda kutip.';
    return null;
  }
}

async function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    importText.value = await file.text();
    parsedImport.value = null;
    importSummary.value = null;
    errorMessage.value = '';
  } catch {
    errorMessage.value = 'File JSON tidak dapat dibaca.';
  } finally {
    input.value = '';
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
      questionPage.value = 1;
      await loadQuestions();
      closeImportModal();
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Gagal menerapkan import.';
    } finally {
      importing.value = false;
    }
  }, 'Terapkan');
}

onMounted(async () => {
  try {
    const authStatus = await fetchAdminAuthStatus();
    adminEnabled.value = authStatus.enabled;
    adminSession.value = authStatus.session;
    if (!adminSession.value && isAuthenticated.value) {
      sessionStorage.removeItem('admin_token');
      isAuthenticated.value = false;
    }
    if (adminEnabled.value && isAuthenticated.value) {
      await loadData();
      startRealtime();
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memeriksa akses editor.';
  } finally {
    authLoading.value = false;
  }
});

onUnmounted(() => {
  if (questionSearchTimer) clearTimeout(questionSearchTimer);
  stopRealtime();
});
</script>

<style scoped>
.admin-view { min-height: 100vh; min-height: 100svh; min-height: 100dvh; padding: 32px clamp(18px, 4vw, 56px) 48px; color: #1d3557; }
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
.admin-header-actions { display: flex; align-items: center; gap: 10px; }
.realtime-indicator { display: inline-flex; align-items: center; gap: 6px; padding: 7px 9px; border-radius: 999px; color: #607693; background: #edf3f9; font-size: .7rem; font-weight: 800; white-space: nowrap; }
.realtime-indicator i { width: 7px; height: 7px; border-radius: 50%; background: #8b9bae; }
.realtime-connected { color: #207553; background: #e4f7ed; }.realtime-connected i { background: #2ca673; box-shadow: 0 0 0 3px rgba(44,166,115,.15); }
.realtime-connecting { color: #8c641f; background: #fff4dc; }.realtime-connecting i { background: #d89d36; animation: realtime-pulse 1.3s infinite; }
.realtime-disconnected { color: #9a5660; background: #ffedf0; }.realtime-disconnected i { background: #cc6573; }
@keyframes realtime-pulse { 50% { opacity: .35; } }
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
.question-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.toolbar-search { display: flex; min-width: 0; flex: 1; gap: 8px; }
.toolbar-search .search-input { max-width: 420px; }
.question-filters { display: flex; flex-wrap: wrap; gap: 7px; margin: 14px 0 16px; }
.question-filters > .ruas-select { width: min(210px, 100%); }
.question-filters > .topic-filter-select { width: min(300px, 100%); }
.topic-access-panel { margin-bottom: 16px; padding: 0; }
.topic-access-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; color: #1e40af; cursor: pointer; list-style: none; }
.topic-access-summary::-webkit-details-marker { display: none; }
.topic-access-summary::after { content: '⌄'; color: #5b7ba7; font-size: 1.1rem; font-weight: 800; transition: transform .16s ease; }
.topic-access-panel[open] .topic-access-summary::after { transform: rotate(180deg); }
.topic-access-summary span:first-child { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.topic-access-summary strong { font-size: 1rem; }
.topic-access-summary small { color: #7a91ad; font-size: .72rem; font-weight: 500; }
.topic-access-count { padding: 5px 9px; border-radius: 999px; color: #356bb5; background: #edf5ff; font-size: .7rem; font-weight: 800; white-space: nowrap; }
.topic-access-content { padding: 0 18px 16px; }
.topic-access-content > .field-hint { margin-bottom: 10px; }
.topic-access-search { width: min(360px, 100%); margin-bottom: 10px; padding: 9px 11px; border: 1px solid #d4e2ef; border-radius: 8px; color: #334b68; background: #fbfdff; font: inherit; font-size: .78rem; }
.topic-access-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.topic-access-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 390px); align-items: center; gap: 8px 14px; padding: 10px 12px; border: 1px solid #e1eaf4; border-radius: 10px; background: #fbfdff; }
.topic-access-info { min-width: 0; }.topic-access-info strong, .topic-access-info small { display: block; }.topic-access-info strong { color: #2c4f7a; font-size: .82rem; }.topic-access-info small { margin-top: 3px; color: #8497ae; font-size: .7rem; }
.topic-access-controls { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; }
.topic-access-controls input { min-width: 0; padding: 9px 10px; border: 1px solid #d4dde6; border-radius: 8px; color: #334b68; background: #fff; font: inherit; font-size: .78rem; }
.topic-access-controls .primary-btn { padding: 9px 12px; font-size: .74rem; }
.topic-access-reveal { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; padding-top: 2px; color: #28734f; font-size: .72rem; }
.topic-access-reveal code { padding: 5px 8px; color: #1f5e42; background: #e7f7ed; font-size: .78rem; letter-spacing: .06em; }
.topic-access-reveal button { padding: 4px 8px; border: 1px solid #acd9bd; border-radius: 6px; color: #28734f; background: #fff; cursor: pointer; font: inherit; font-weight: 700; }
.filter-chip { padding: 7px 12px; border: 1px solid #d7e2ef; border-radius: 999px; color: #617793; background: #fff; font: inherit; font-size: .75rem; font-weight: 700; cursor: pointer; }
.filter-chip:hover, .filter-chip.active { border-color: #2b72ce; color: #fff; background: #2b72ce; }
.search-input { max-width: 420px; }
.editor-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; align-items: start; }
.question-list-panel { padding: 0; overflow: hidden; }
.question-list-panel .panel-heading, .form-panel .panel-heading, .import-panel .panel-heading { padding: 20px; border-bottom: 1px solid #e2e8f0; }
.panel-heading span { color: #778899; font-size: .9rem; }
.question-row { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; width: 100%; padding: 13px 20px; border: 0; border-bottom: 1px solid #edf1f5; background: #fff; color: #253f62; text-align: left; cursor: pointer; }
.question-row:hover, .question-row.active { background: #f0f4ff; }
.question-row-top, .question-row-bottom { display: flex; width: 100%; align-items: center; gap: 7px; }
.question-row-top { min-width: 0; }
.question-row-bottom { justify-content: space-between; }
.question-number { color: #2564ba; font-size: .75rem; font-weight: 800; }
.topic-badge, .question-type-badge, .difficulty-badge { display: inline-flex; max-width: 100%; overflow: hidden; align-items: center; padding: 4px 7px; border-radius: 999px; font-size: .67rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.topic-badge { color: #41688f; background: #edf5ff; }
.question-type-badge { color: #7650b6; background: #f1ebff; }
.question-status-badge { display: inline-flex; align-items: center; padding: 4px 7px; border-radius: 999px; color: #93651b; background: #fff2cf; font-size: .67rem; font-weight: 800; white-space: nowrap; }
.difficulty-badge { color: #687c96; background: #eef2f7; }
.difficulty-easy { color: #287b59; background: #e2f7ed; }.difficulty-medium { color: #9a691a; background: #fff3d9; }.difficulty-hard { color: #ae4d55; background: #ffebeb; }
.question-menu { margin-left: auto; color: #8ca0b8; font-size: 1.25rem; line-height: 1; }
.question-row > strong { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: #294b76; font-size: .87rem; line-height: 1.45; }
.row-id { overflow: hidden; color: #778899; font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }
.panel-empty { padding: 24px 20px; color: #778899; }
.question-pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 16px; border-top: 1px solid #e5edf6; color: #7389a3; font-size: .72rem; }
.pagination-controls { display: flex; align-items: center; gap: 7px; }
.pagination-btn { display: grid; width: 29px; height: 29px; place-items: center; border: 1px solid #d4e2f1; border-radius: 8px; color: #246bc5; background: #f4f8fd; font-size: 1.05rem; line-height: 1; cursor: pointer; }
.pagination-btn:disabled { color: #aab9c9; background: #f1f4f8; cursor: default; }
.pagination-controls .ruas-select { width: 104px; }
.form-panel form { display: flex; flex-direction: column; gap: 14px; padding: 20px; }
.form-heading-actions { display: flex; align-items: center; gap: 8px; }
.close-form-btn { display: grid; width: 30px; height: 30px; place-items: center; border: 0; border-radius: 50%; color: #58718e; background: #edf3fa; font-size: 1.3rem; line-height: 1; cursor: pointer; }
label { display: flex; flex-direction: column; gap: 6px; color: #445566; font-weight: 600; }
.field-hint { color: #778899; font-weight: 400; font-size: .8rem; }
.math-preview { padding: 12px; border: 1px dashed #b8c5d5; border-radius: 8px; background: #f8fafc; color: #445566; }
.preview-label { display: block; margin-bottom: 6px; color: #778899; font-size: .8rem; font-weight: 700; }
textarea { resize: vertical; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
fieldset { border: 1px solid #d4dde6; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
legend { padding: 0 6px; color: #445566; font-weight: 600; }
.topic-mapping-fieldset { gap: 10px; }
.topic-mapping-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; max-height: 210px; overflow-y: auto; padding: 2px; }
.topic-mapping-option { position: relative; display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto; align-items: center; gap: 9px; min-width: 0; padding: 12px; border: 1px solid #dbe6f2; border-radius: 12px; color: #445566; background: #fbfdff; font-size: .82rem; font-weight: 600; cursor: pointer; transition: border-color .16s ease, background .16s ease, box-shadow .16s ease, transform .16s ease; }
.topic-mapping-option:hover { border-color: #8db8e8; background: #f5f9ff; transform: translateY(-1px); }
.topic-mapping-option.selected { border-color: #4f83d9; background: linear-gradient(135deg, #f1f7ff, #fff); box-shadow: 0 5px 12px rgba(53, 111, 200, .1); }
.topic-mapping-checkbox { width: 18px !important; height: 18px; flex: 0 0 auto; margin: 0; padding: 0 !important; accent-color: #2454be; cursor: pointer; }
.topic-mapping-icon { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 9px; color: #2b6dc2; background: #e7f1ff; font-size: .9rem; }
.topic-mapping-copy { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.topic-mapping-copy strong { overflow: hidden; color: #274d7f; font-size: .79rem; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
.topic-mapping-copy small { overflow: hidden; color: #7b91aa; font-size: .68rem; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.topic-mapping-check { display: grid; width: 21px; height: 21px; place-items: center; border-radius: 50%; color: transparent; background: #e9eff6; font-size: .72rem; font-weight: 800; }
.topic-mapping-option.selected .topic-mapping-check { color: #fff; background: #2e6ed0; }
.question-media-fieldset .question-media-gallery { margin: 8px 0; }
.question-media-admin-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; border: 1px solid #dbe6f2; border-radius: 8px; color: #445566; font-size: .82rem; }
.media-upload-fields { display: grid; gap: 8px; }
.media-file-picker { display: inline-flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px dashed #a9c3df; border-radius: 8px; color: #2454be; background: #f5f9ff; cursor: pointer; }
.media-file-picker input { max-width: 220px; font-size: .75rem; }
.option-editor { display: flex; align-items: center; gap: 8px; }
.option-key-input { width: 54px; padding: 8px; border: 1px solid #d4dde6; border-radius: 6px; }
.option-text-input { min-width: 0; flex: 1; padding: 8px; border: 1px solid #d4dde6; border-radius: 6px; }
.correct-toggle { flex-direction: row; align-items: center; white-space: nowrap; font-size: .85rem; }
.remove-option, .danger-link, .archive-link, .restore-link { border: 0; background: transparent; cursor: pointer; font-weight: 700; }
.danger-link, .archive-link { color: #c53030; }
.restore-link { color: #28734f; }
.add-option { align-self: flex-start; color: #1e40af; border: 0; background: transparent; cursor: pointer; font-weight: 600; }
.import-panel { display: none; flex-direction: column; gap: 14px; }
.form-panel { display: none; }
.form-panel.open, .import-panel.open { position: fixed; z-index: 60; top: 50%; left: 50%; display: flex; width: min(800px, calc(100vw - 40px)); max-height: calc(100vh - 40px); overflow-y: auto; transform: translate(-50%, -50%); border: 1px solid #d8e6f5; border-radius: 18px; box-shadow: 0 0 0 100vmax rgba(18, 42, 76, .34), 0 22px 55px rgba(22, 55, 104, .28); }
.form-panel.open { flex-direction: column; }
.form-panel.open .panel-heading, .import-panel.open .panel-heading { position: sticky; z-index: 1; top: 0; background: #fff; }
.form-panel.open .close-form-btn, .import-panel.open .close-form-btn { display: grid; }
.import-panel .panel-heading { margin: -20px -20px 0; }
.import-panel .panel-heading p { font-size: .85rem; margin-top: 4px; }
.import-file-picker { display: flex; width: fit-content; align-items: center; padding: 9px 12px; border: 1px dashed #8eb9e8; border-radius: 9px; color: #246bc5; background: #f3f8ff; font-size: .78rem; font-weight: 700; cursor: pointer; }
.import-file-picker:hover { border-color: #287bd7; background: #eaf4ff; }
.import-file-picker input { display: none; }
.import-textarea { width: 100%; padding: 12px; border: 2px solid #d4dde6; border-radius: 8px; font: 0.9rem monospace; }
.import-actions { justify-content: flex-start; }
.import-summary { background: #f0f4ff; padding: 12px; border-radius: 8px; }
.error-text { color: #c53030; }
.success-text { color: #2f855a; }
code { background: #edf1f5; padding: 2px 4px; border-radius: 4px; }
@media (max-width: 720px) { .editor-grid { grid-template-columns: 1fr; } .toolbar { flex-wrap: wrap; } .search-input { max-width: none; flex: 1; } .field-row { grid-template-columns: 1fr; } .admin-header { align-items: flex-start; } }
@media (max-width: 720px) { .topic-access-row { grid-template-columns: 1fr; } .topic-access-controls { grid-template-columns: minmax(0, 1fr) auto; } }
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

.schedule-layout { display: grid; grid-template-columns: minmax(260px, .82fr) minmax(0, 1.18fr); gap: 16px; align-items: start; }
.schedule-editor-form, .schedule-list-card { min-width: 0; padding: 16px; border: 1px solid #e1eaf4; border-radius: 13px; background: #fbfdff; }
.schedule-editor-form { align-items: stretch; flex-direction: column; padding-top: 16px; }
.schedule-editor-form .panel-heading, .schedule-list-card .panel-heading { margin: 0 0 4px; padding: 0 0 10px; border-bottom: 1px solid #e6eef6; }
.schedule-editor-form .panel-heading h3, .schedule-list-card .panel-heading h3 { color: #245a9d; font-size: .98rem; }
.schedule-editor-form label { width: 100%; }
.label-optional { color: #95a6ba; font-size: .72rem; font-weight: 400; }
.schedule-toggle { flex-direction: row !important; align-items: center; gap: 7px; color: #456382; font-size: .8rem; }
.schedule-toggle input { width: auto; accent-color: #2671c9; }
.schedule-list-card { display: flex; flex-direction: column; gap: 8px; }
.schedule-empty { padding: 14px 4px; color: #7d94ae; font-size: .8rem; }
.schedule-group { display: flex; flex-direction: column; gap: 8px; }
.schedule-group h4 { display: flex; align-items: center; gap: 7px; margin: 8px 2px 0; color: #456382; font-size: .76rem; }
.schedule-group h4 span { display: inline-grid; min-width: 20px; height: 20px; place-items: center; border-radius: 999px; color: #2a65b5; background: #e7f1ff; font-size: .65rem; }
.schedule-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 10px; width: 100%; padding: 12px; border: 1px solid #e1eaf4; border-radius: 11px; color: #385b86; background: #fff; font: inherit; text-align: left; cursor: pointer; transition: border-color .16s ease, transform .16s ease, box-shadow .16s ease; }
.schedule-row:hover { border-color: #8bb8ea; box-shadow: 0 6px 14px rgba(35, 101, 199, .1); transform: translateY(-1px); }
.schedule-row-main { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.schedule-row-main strong { overflow: hidden; color: #244978; font-size: .82rem; text-overflow: ellipsis; white-space: nowrap; }
.schedule-row-main small, .schedule-row-time { color: #8196ae; font-size: .7rem; }
.schedule-row-state { align-self: start; padding: 4px 7px; border-radius: 999px; color: #23734b; background: #dcf7e9; font-size: .65rem; font-weight: 800; white-space: nowrap; }
.schedule-row-state.state-upcoming { color: #916300; background: #fff2c2; }
.schedule-row-state.state-ended, .schedule-row-state.state-disabled { color: #a24d58; background: #ffebeb; }
.schedule-row-time { grid-column: 1 / -1; line-height: 1.4; }

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

.question-owner-badge {
  display: inline-flex;
  max-width: min(220px, 30vw);
  overflow: hidden;
  align-items: center;
  padding: 4px 7px;
  border-radius: 999px;
  font-size: .67rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.question-owner-badge.editor-owner { color: #6d28d9; background: #f3e8ff; }
.question-owner-badge.admin-owner { color: #2364ad; background: #eaf3ff; }
.question-readonly-note { margin: 20px 20px 0; padding: 10px 12px; border: 1px solid #eadcff; border-radius: 9px; color: #6d28d9; background: #faf5ff; font-size: .78rem; line-height: 1.45; }
.question-topic-empty { color: #7b91aa; font-size: .76rem; font-weight: 400; line-height: 1.4; }
.question-topic-empty button { padding: 0; border: 0; color: #6d28d9; background: transparent; font: inherit; font-weight: 800; cursor: pointer; }
.question-readonly-fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
.question-readonly-fieldset:disabled { opacity: .82; }

.editor-view .sidebar-mark { background: linear-gradient(145deg, #8b5cf6, #5b21b6); box-shadow: 0 8px 16px rgba(109, 40, 217, .22); }
.editor-view .sidebar-brand strong, .editor-view .page-title, .editor-view .login-card h2, .editor-view .panel h2 { color: #6d28d9; }
.editor-view .nav-item:hover { color: #6d28d9; background: #f3e8ff; }
.editor-view .nav-item.active { background: linear-gradient(100deg, #8b5cf6, #6d28d9); box-shadow: 0 9px 18px rgba(109, 40, 217, .2); }
.editor-view .sidebar-help { background: #f5edff; }
.editor-view .sidebar-help strong { color: #6d28d9; }
.editor-view .welcome-card { background: linear-gradient(115deg, #6d28d9, #a855f7); box-shadow: 0 14px 28px rgba(109, 40, 217, .2); }
.editor-view .primary-btn { background: #6d28d9; }
.editor-view .secondary-btn { color: #6d28d9; }
.editor-view .filter-chip:hover, .editor-view .filter-chip.active { border-color: #7c3aed; background: #7c3aed; }
.editor-view .pagination-btn { color: #6d28d9; }
.editor-view .topic-access-summary { color: #6d28d9; }
.teacher-workspace-view { padding: 0; background: #111115; }
.teacher-workspace-view .admin-layout { display: block; max-width: none; }
.teacher-workspace-view .admin-sidebar, .teacher-workspace-view .dashboard-header { display: none; }
.teacher-workspace-view .admin-content { width: 100%; }
.teacher-workspace-view .teacher-workspace-home { min-height: 100vh; border-radius: 0; box-shadow: none; }

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
  .schedule-layout { grid-template-columns: 1fr; }
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
  .import-question-button, .new-question-button { width: 100%; }
  .question-filters { margin-top: 12px; }
  .question-filters > .ruas-select { width: 100%; }
  .topic-access-panel { padding: 16px; }
  .topic-access-row { align-items: stretch; flex-direction: column; }
  .topic-access-controls { min-width: 0; grid-template-columns: 1fr; }
  .topic-access-controls .primary-btn { width: 100%; }
  .question-list-panel { min-height: 220px; }
  .question-pagination { align-items: flex-start; flex-direction: column; }
  .pagination-controls { width: 100%; justify-content: space-between; }
  .form-panel { display: none; }
  .form-panel.open, .import-panel.open { position: fixed; z-index: 40; inset: 0; display: flex; width: 100%; max-height: none; overflow-y: auto; transform: none; flex-direction: column; padding: 0; border-radius: 0; box-shadow: none; }
  .form-panel.open .panel-heading { position: sticky; z-index: 1; top: 0; padding: 16px 18px; background: #fff; }
  .import-panel.open .panel-heading { position: sticky; z-index: 1; top: 0; margin: -20px -20px 0; padding: 16px 18px; background: #fff; }
  .form-panel.open form { padding: 18px; padding-bottom: 34px; }
  .topic-mapping-grid { grid-template-columns: 1fr; }
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
.teacher-workspace-view .mobile-bottom-nav, .teacher-workspace-view .mobile-more-menu, .teacher-workspace-view .mobile-more-backdrop { display: none !important; }
@media print {
  .mobile-bottom-nav, .mobile-more-menu, .mobile-more-backdrop { display: none !important; }
}
</style>
