<template>
  <section class="users-panel">
    <ConfirmDialog :open="confirmOpen" :title="confirmTitle" :message="confirmMessage" :confirm-label="confirmLabel" :confirmation-phrase="confirmPhrase" @confirm="runConfirmation" @cancel="closeConfirmation" />
    <div class="users-grid">
      <div class="panel user-form-panel" :class="{ open: userFormOpen }">
        <div class="panel-heading">
          <div>
            <h2>{{ editingId === null ? 'Tambah pengguna' : `Edit pengguna #${editingId}` }}</h2>
            <p v-if="isEditor">Tambahkan siswa yang berada pada penetapan kelas dan mata pelajaran Anda.</p>
            <p v-else>Akun, kelas, dan penetapan mata pelajaran disimpan aman di database.</p>
          </div>
          <div class="user-form-actions"><button v-if="editingId !== null" class="text-button" type="button" @click="resetForm">Batal</button><button class="panel-collapse-button" type="button" @click="closeUserForm">Sembunyikan</button><button class="mobile-close-button" type="button" aria-label="Tutup form pengguna" @click="closeUserForm">×</button></div>
        </div>
        <form class="user-form" @submit.prevent="saveUser">
          <label>Username<input v-model.trim="form.username" required autocomplete="off" placeholder="Contoh: P130100230" /></label>
          <label>Nama tampilan<input v-model.trim="form.display_name" required placeholder="Nama peserta" /></label>
          <label v-if="!isEditor || editorClassId === null">Kelas peserta<RuasSelect v-model="form.class_id" :options="classOptions" aria-label="Kelas peserta" /></label>
          <p v-else class="scope-note">Kelas: {{ classLabel(editorClassId ?? 0) }}</p>
          <label v-if="!isEditor">Mata pelajaran peserta<RuasSelect v-model="form.subject_id" :options="subjectOptions" aria-label="Mata pelajaran peserta" /></label>
          <p v-else class="scope-note">Mata pelajaran: {{ subjectLabel(editorSubjectId) }}</p>
          <label>Password {{ editingId === null ? '' : '(kosongkan jika tidak diubah)' }}<input v-model="form.password" :required="editingId === null" type="password" autocomplete="new-password" placeholder="Password akun" /></label>
          <label v-if="isEditor" class="active-field"><span>Status</span><span class="check-line"><input v-model="form.active" type="checkbox" /> Aktif</span></label>
          <div v-if="!isEditor" class="user-fields-row">
            <label>Peran<RuasSelect v-model="form.role" :options="roleOptions" aria-label="Peran pengguna" /></label>
            <label class="active-field"><span>Status</span><span class="check-line"><input v-model="form.active" type="checkbox" /> Aktif</span></label>
          </div>
          <label v-if="!isEditor" class="demo-field"><span>Mode demo</span><span class="check-line"><input v-model="form.is_demo" type="checkbox" /> Jadikan satu-satunya akun demo publik</span><small>Hanya untuk peran Peserta. Data percobaan akun demo tidak masuk laporan dan akan direset saat demo dibuka.</small></label>
          <p v-if="formMessage" :class="formMessageType === 'error' ? 'error-text' : 'success-text'">{{ formMessage }}</p>
          <button class="primary-btn full-btn" type="submit" :disabled="saving"><span aria-hidden="true">＋</span> {{ saving ? 'Menyimpan...' : editingId === null ? 'Tambah Pengguna' : 'Simpan Perubahan' }}</button>
        </form>
      </div>

      <div class="panel import-users-panel" :class="{ open: importPanelOpen }">
        <div class="panel-heading">
          <div><h2>Import pengguna</h2><p v-if="isEditor">Semua baris akan dibuat sebagai Peserta pada scope Anda.</p><p v-else>CSV: <code>username,password,display_name,role,active,class_id,class_code,subject_id</code></p></div>
          <div class="import-panel-actions"><label class="import-mode-field"><span>Mode import</span><RuasSelect v-model="importMode" :options="importModeOptions" aria-label="Mode import pengguna" /></label><button class="panel-collapse-button" type="button" @click="importPanelOpen = false">Sembunyikan</button></div>
        </div>
        <div class="import-step"><span class="step-number">1</span><div><strong>Pilih file atau tempel data</strong><small>Gunakan format CSV atau JSON.</small></div></div>
        <input ref="fileInput" class="hidden-file-input" type="file" accept=".csv,.json,application/json,text/csv" @change="readFile" />
        <div class="import-file-actions">
          <button class="file-picker-button" type="button" @click="openFilePicker"><span class="action-icon" aria-hidden="true">↥</span><span><strong>Pilih File</strong><small>{{ selectedFileName || 'CSV atau JSON' }}</small></span></button>
          <div class="template-links" aria-label="Unduh template impor">
            <span>Template:</span>
            <a href="/templates/pengguna.csv" download>CSV</a>
            <a href="/templates/pengguna.json" download>JSON</a>
          </div>
        </div>
        <textarea v-model="importText" rows="7" placeholder="Atau tempel CSV atau JSON di sini..." spellcheck="false"></textarea>
        <div class="import-step"><span class="step-number">2</span><div><strong>Periksa lalu terapkan</strong><small>Preview untuk memvalidasi data sebelum disimpan.</small></div></div>
        <div class="import-actions"><button class="secondary-btn action-btn" type="button" :disabled="importing || !importText.trim()" @click="previewImport"><span aria-hidden="true">◉</span> Preview</button><button class="primary-btn action-btn" type="button" :disabled="importing || !parsedImport" @click="applyImport"><span aria-hidden="true">✓</span> Terapkan</button></div>
        <div v-if="importSummary" class="import-summary"><strong>{{ importSummary.inserted }} baru · {{ importSummary.updated }} diperbarui · {{ importSummary.skipped }} dilewati</strong><p v-for="error in importSummary.errors" :key="error" class="error-text">{{ error }}</p></div>
      </div>
    </div>

    <div class="panel users-list-panel">
      <div class="panel-heading users-list-heading"><div><h2>Daftar pengguna</h2><p>{{ users.length }} akun ditemukan.</p></div><div class="user-list-actions"><div class="user-search"><span class="search-icon" aria-hidden="true">⌕</span><input v-model="search" placeholder="Cari username, nama, atau kelas" @keyup.enter="loadUsers" /><button class="search-button" type="button" aria-label="Cari pengguna" title="Cari" @click="loadUsers">Cari</button></div><div class="user-panel-toggles"><button class="panel-toggle-button" type="button" @click="openNewUser">＋ {{ userFormOpen ? 'Edit pengguna' : 'Tambah pengguna' }}</button><button class="panel-toggle-button secondary" type="button" @click="importPanelOpen = !importPanelOpen">{{ importPanelOpen ? 'Sembunyikan import' : 'Import pengguna' }}</button></div></div></div>
      <div v-if="!isEditor && participantCount > 0" class="danger-zone"><div><strong>Hapus semua peserta</strong><small>{{ participantCount }} akun peserta akan dihapus. Akun admin/editor dan laporan asesmen tetap aman.</small></div><button class="danger-zone-button" type="button" :disabled="deletingAll" @click="removeAllParticipants">{{ deletingAll ? 'Menghapus...' : 'Hapus semua peserta' }}</button></div>
      <div v-if="!isEditor && users.length" class="bulk-assignment-bar">
        <div class="bulk-assignment-copy"><strong>Penetapan massal</strong><small>{{ selectedUserIds.length ? `${selectedUserIds.length} pengguna dipilih` : 'Cari kelas atau identitas pengguna, lalu pilih semua hasil.' }}</small></div>
        <button class="select-all-button" type="button" @click="toggleAllUsers">{{ allUsersSelected ? 'Batalkan semua' : 'Pilih semua hasil' }}</button>
        <div class="bulk-action-row"><RuasSelect v-model="bulkClassId" :options="classOptions" placeholder="Pilih kelas" aria-label="Kelas penetapan massal" /><button class="primary-btn bulk-apply-button" type="button" :disabled="bulkSaving || selectedUserIds.length === 0 || bulkClassId === undefined" @click="applyBulkClass">{{ bulkSaving ? 'Menyimpan...' : 'Tetapkan kelas' }}</button></div>
        <div class="bulk-action-row"><RuasSelect v-model="bulkSubjectId" :options="subjectOptions" placeholder="Pilih mata pelajaran" aria-label="Mata pelajaran penetapan massal" /><button class="secondary-btn bulk-apply-button" type="button" :disabled="bulkSaving || selectedUserIds.length === 0 || bulkSubjectId === undefined" @click="applyBulkSubject">{{ bulkSaving ? 'Menyimpan...' : 'Tetapkan mapel' }}</button></div>
      </div>
      <p v-if="bulkMessage" :class="bulkMessageType === 'error' ? 'error-text' : 'success-text'">{{ bulkMessage }}</p>
      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <div v-if="loading" class="panel-empty">Memuat pengguna...</div>
      <div v-else-if="users.length === 0" class="panel-empty">Belum ada pengguna.</div>
      <div v-else class="user-table-wrap"><table class="user-table"><thead><tr><th v-if="!isEditor" class="selection-column"><input type="checkbox" :checked="allUsersSelected" aria-label="Pilih semua pengguna" @change="toggleAllUsers" /></th><th>Pengguna</th><th>Peran / penetapan</th><th>Status</th><th>Aksi</th></tr></thead><tbody><tr v-for="user in users" :key="user.id"><td v-if="!isEditor" class="selection-column"><input type="checkbox" :checked="isUserSelected(user.id)" :aria-label="`Pilih ${user.display_name}`" @change="toggleUser(user.id)" /></td><td class="user-identity"><strong>{{ user.display_name }}</strong><small>{{ user.username }}</small></td><td class="user-assignment"><span class="role-badge">{{ roleLabel(user.role) }}</span><span v-if="user.is_demo" class="demo-badge">Demo publik</span><small>Kelas: {{ user.class_label || 'Belum ditetapkan' }}</small><small>Mapel: {{ subjectLabel(user.subject_id) }}</small></td><td class="user-status"><span :class="['status-badge', { inactive: !user.active }]">{{ user.active ? 'Aktif' : 'Nonaktif' }}</span><span v-if="user.must_change_password" class="password-status-badge">Wajib ubah sandi</span></td><td class="user-actions"><button class="text-button" type="button" @click="editUser(user)">Edit</button><button v-if="!user.is_demo" class="text-button" type="button" @click="resetPassword(user)">Reset sandi</button><button v-if="!isEditor" class="danger-link" type="button" @click="removeUser(user)">Hapus</button></td></tr></tbody></table></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { assignAdminUsersClass, assignAdminUsersSubject, createAdminUser, deleteAdminUser, deleteAllAdminParticipants, fetchAdminCurriculum, fetchAdminParticipantCount, fetchAdminUsers, importAdminUsers, resetAdminUserPassword, updateAdminUser } from '@/api/client';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import RuasSelect from '@/components/RuasSelect.vue';
import type { AdminSession, AdminUser, AdminUserInput, CurriculumClass, Subject, UserImportSummary, UserRole } from '@/types';
import { ADMIN_REALTIME_EVENT, type AdminRealtimeEvent } from '@/lib/admin-realtime';

const props = defineProps<{ adminSession: AdminSession | null }>();
const isEditor = computed(() => props.adminSession?.role === 'editor');
const editorClassId = computed(() => props.adminSession?.class_id ?? null);
const editorSubjectId = computed(() => props.adminSession?.subject_id ?? null);

const users = ref<AdminUser[]>([]);
const participantCount = ref(0);
const classes = ref<CurriculumClass[]>([]);
const subjects = ref<Subject[]>([]);
const loading = ref(false);
const saving = ref(false);
const importing = ref(false);
const errorMessage = ref('');
const formMessage = ref('');
const formMessageType = ref<'success' | 'error'>('success');
const editingId = ref<number | null>(null);
const userFormOpen = ref(false);
const importPanelOpen = ref(false);
const search = ref('');
const importText = ref('');
const parsedImport = ref<unknown>(null);
const importMode = ref<'insert' | 'upsert'>('insert');
const importSummary = ref<UserImportSummary | null>(null);
const selectedUserIds = ref<number[]>([]);
const bulkClassId = ref<number | null | undefined>(undefined);
const bulkSubjectId = ref<number | null | undefined>(undefined);
const bulkSaving = ref(false);
const bulkMessage = ref('');
const bulkMessageType = ref<'success' | 'error'>('success');
const deletingAll = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFileName = ref('');
const confirmOpen = ref(false);
const confirmTitle = ref('Konfirmasi tindakan');
const confirmMessage = ref('Apakah kamu yakin ingin melanjutkan?');
const confirmLabel = ref('OK');
const confirmPhrase = ref<string | undefined>(undefined);
const pendingConfirmation = ref<(() => Promise<void>) | null>(null);
const form = reactive<AdminUserInput>({ username: '', password: '', display_name: '', class_id: editorClassId.value, subject_id: editorSubjectId.value, role: 'participant', active: true, is_demo: false });
const classOptions = computed(() => [{ value: null, label: 'Belum ditetapkan' }, ...classes.value.map((item) => ({ value: item.id, label: `${item.label} · ${item.academic_year}` }))]);
const subjectOptions = computed(() => [{ value: null, label: 'Belum ditetapkan' }, ...subjects.value.map((subject) => ({ value: subject.id, label: subject.label }))]);
const roleOptions = [
  { value: 'participant', label: 'Peserta' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
];
const importModeOptions = [
  { value: 'insert', label: 'Tambah baru' },
  { value: 'upsert', label: 'Tambah atau perbarui' },
];
const allUsersSelected = computed(() => users.value.length > 0 && users.value.every((user) => selectedUserIds.value.includes(user.id)));
let searchTimer: ReturnType<typeof setTimeout> | null = null;

function resetForm() { Object.assign(form, { username: '', password: '', display_name: '', class_id: editorClassId.value, subject_id: editorSubjectId.value, role: 'participant', active: true, is_demo: false }); editingId.value = null; formMessage.value = ''; userFormOpen.value = false; }
function openNewUser() { resetForm(); userFormOpen.value = true; }
function closeUserForm() { userFormOpen.value = false; }
function openFilePicker() { fileInput.value?.click(); }
function editUser(user: AdminUser) { Object.assign(form, { username: user.username, password: '', display_name: user.display_name, class_id: isEditor.value ? editorClassId.value ?? user.class_id : user.class_id, subject_id: isEditor.value ? editorSubjectId.value : user.subject_id, role: isEditor.value ? 'participant' : user.role, active: user.active, is_demo: isEditor.value ? false : user.is_demo }); editingId.value = user.id; formMessage.value = ''; userFormOpen.value = true; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function askConfirmation(title: string, message: string, action: () => Promise<void>, label = 'OK', phrase?: string) { confirmTitle.value = title; confirmMessage.value = message; confirmLabel.value = label; confirmPhrase.value = phrase; pendingConfirmation.value = action; confirmOpen.value = true; }
function closeConfirmation() { confirmOpen.value = false; confirmPhrase.value = undefined; pendingConfirmation.value = null; }
async function runConfirmation() { const action = pendingConfirmation.value; closeConfirmation(); if (action) await action(); }
async function loadUsers() { loading.value = true; errorMessage.value = ''; try { users.value = await fetchAdminUsers(search.value); selectedUserIds.value = []; } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat pengguna.'; } finally { loading.value = false; } }
watch(search, () => { if (searchTimer) clearTimeout(searchTimer); searchTimer = setTimeout(() => { void loadUsers(); }, 350); });
async function loadParticipantCount() { try { participantCount.value = await fetchAdminParticipantCount(); } catch { participantCount.value = 0; } }
async function saveUser() { saving.value = true; formMessage.value = ''; const currentId = editingId.value; try { const input = { ...form }; if (currentId === null) await createAdminUser(input); else await updateAdminUser(currentId, input); formMessageType.value = 'success'; resetForm(); formMessage.value = currentId === null ? 'Pengguna berhasil ditambahkan.' : 'Pengguna berhasil diperbarui.'; await Promise.all([loadUsers(), loadParticipantCount()]); } catch (error) { formMessageType.value = 'error'; formMessage.value = error instanceof Error ? error.message : 'Gagal menyimpan pengguna.'; } finally { saving.value = false; } }
function resetPassword(user: AdminUser) { askConfirmation('Reset sandi pengguna?', `Sandi ${user.username} akan diganti dengan sandi sementara. Sesi login lama akan dibatalkan.`, async () => { try { const result = await resetAdminUserPassword(user.id); bulkMessageType.value = 'success'; bulkMessage.value = `Sandi sementara ${user.username}: ${result.temporary_password}. Berikan sandi ini kepada pengguna dan minta pengguna menggantinya setelah login.`; await loadUsers(); } catch (error) { bulkMessageType.value = 'error'; bulkMessage.value = error instanceof Error ? error.message : 'Gagal mereset sandi pengguna.'; } }, 'Reset sandi'); }
function removeUser(user: AdminUser) { askConfirmation('Hapus pengguna?', `Akun ${user.username} akan dihapus. Tindakan ini tidak dapat dibatalkan.`, async () => { try { await deleteAdminUser(user.id); await Promise.all([loadUsers(), loadParticipantCount()]); } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Gagal menghapus pengguna.'; } }, 'Hapus'); }
function removeAllParticipants() { askConfirmation('Hapus semua peserta?', `Sebanyak ${participantCount.value} akun peserta akan dihapus permanen. Riwayat asesmen tetap tersimpan, tetapi akun peserta tidak dapat dipulihkan.`, async () => { deletingAll.value = true; errorMessage.value = ''; try { const deleted = await deleteAllAdminParticipants('HAPUS SEMUA PESERTA'); bulkMessageType.value = 'success'; bulkMessage.value = `${deleted} akun peserta berhasil dihapus.`; await Promise.all([loadUsers(), loadParticipantCount()]); } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Gagal menghapus semua peserta.'; } finally { deletingAll.value = false; } }, 'Hapus semua', 'HAPUS SEMUA PESERTA'); }
function isUserSelected(id: number) { return selectedUserIds.value.includes(id); }
function toggleUser(id: number) { selectedUserIds.value = isUserSelected(id) ? selectedUserIds.value.filter((selectedId) => selectedId !== id) : [...selectedUserIds.value, id]; }
function toggleAllUsers() { selectedUserIds.value = allUsersSelected.value ? [] : users.value.map((user) => user.id); }
function applyBulkSubject() {
  if (selectedUserIds.value.length === 0 || bulkSubjectId.value === undefined) return;
  const selectedIds = [...selectedUserIds.value];
  const subjectId = bulkSubjectId.value;
  const subjectLabelText = subjectId === null ? 'Belum ditetapkan' : subjectLabel(subjectId);
  askConfirmation('Terapkan penetapan massal?', `${selectedIds.length} pengguna akan ditetapkan ke ${subjectLabelText}.`, async () => {
    bulkSaving.value = true;
    bulkMessage.value = '';
    try {
      const updated = await assignAdminUsersSubject(selectedIds, subjectId);
      selectedUserIds.value = [];
      bulkSubjectId.value = undefined;
      bulkMessageType.value = 'success';
      bulkMessage.value = `${updated} pengguna berhasil diperbarui.`;
      await loadUsers();
    } catch (error) {
      bulkMessageType.value = 'error';
      bulkMessage.value = error instanceof Error ? error.message : 'Gagal menerapkan penetapan massal.';
    } finally { bulkSaving.value = false; }
  }, 'Terapkan');
}
function applyBulkClass() {
  if (selectedUserIds.value.length === 0 || bulkClassId.value === undefined) return;
  const selectedIds = [...selectedUserIds.value];
  const classId = bulkClassId.value;
  const classLabelText = classId === null ? 'Belum ditetapkan' : classLabel(classId);
  const selectedSearch = allUsersSelected.value ? search.value : undefined;
  askConfirmation('Tetapkan kelas?', `${selectedIds.length} pengguna akan ditetapkan ke ${classLabelText}.`, async () => {
    bulkSaving.value = true;
    bulkMessage.value = '';
    try {
      const updated = await assignAdminUsersClass(selectedIds, classId, selectedSearch);
      selectedUserIds.value = [];
      bulkClassId.value = undefined;
      bulkMessageType.value = 'success';
      bulkMessage.value = `${updated} pengguna berhasil ditetapkan ke ${classLabelText}.`;
      await loadUsers();
    } catch (error) {
      bulkMessageType.value = 'error';
      bulkMessage.value = error instanceof Error ? error.message : 'Gagal menetapkan kelas.';
    } finally { bulkSaving.value = false; }
  }, 'Terapkan');
}
async function readFile(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (file) { selectedFileName.value = file.name; importText.value = await file.text(); parsedImport.value = null; importSummary.value = null; } }
function parseImportText() { const value = importText.value.trim(); try { parsedImport.value = JSON.parse(value); } catch { parsedImport.value = value; } }
async function previewImport() { parseImportText(); importing.value = true; try { importSummary.value = await importAdminUsers(parsedImport.value, importMode.value, true); } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Import tidak valid.'; } finally { importing.value = false; } }
function applyImport() { if (parsedImport.value === null) return; askConfirmation('Terapkan import?', 'Data pengguna yang sudah dipreview akan disimpan ke database.', async () => { importing.value = true; try { importSummary.value = await importAdminUsers(parsedImport.value, importMode.value, false); await Promise.all([loadUsers(), loadParticipantCount()]); } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Gagal menerapkan import.'; } finally { importing.value = false; } }, 'Terapkan'); }
function roleLabel(role: UserRole) { return { admin: 'Admin', editor: 'Editor', participant: 'Peserta' }[role]; }
function classLabel(classId: number) { return classes.value.find((item) => item.id === classId)?.label ?? 'Kelas tidak ditemukan'; }
function subjectLabel(subjectId: number | null) { return subjects.value.find((subject) => subject.id === subjectId)?.label ?? 'Belum ditetapkan'; }
async function handleRealtime(event: Event) {
  const detail = (event as CustomEvent<AdminRealtimeEvent>).detail;
  if (detail?.resource === 'users' || detail?.resource === 'curriculum') {
    await Promise.all([loadUsers(), loadParticipantCount(), fetchAdminCurriculum().then((data) => { classes.value = data.classes; subjects.value = data.subjects; }).catch(() => undefined)]);
  }
}
onMounted(async () => { await Promise.all([loadUsers(), loadParticipantCount(), fetchAdminCurriculum().then((data) => { classes.value = data.classes; subjects.value = data.subjects; }).catch(() => undefined)]); window.addEventListener(ADMIN_REALTIME_EVENT, handleRealtime); });
onUnmounted(() => { if (searchTimer) clearTimeout(searchTimer); });
onUnmounted(() => window.removeEventListener(ADMIN_REALTIME_EVENT, handleRealtime));
</script>

<style scoped>
.users-panel { display: flex; flex-direction: column; gap: 18px; }
.users-panel .panel { padding: 20px; border: 1px solid #e0e9f3; border-radius: 16px; background: #fff; box-shadow: 0 7px 18px rgba(31, 74, 126, .05); }
.users-panel button { transition: transform .16s ease, box-shadow .16s ease, background .16s ease; }
.users-panel button:not(:disabled):hover { transform: translateY(-1px); }
.users-grid { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); gap: 20px; }
.user-form-panel, .import-users-panel { display: none; flex-direction: column; gap: 14px; }
.user-form-panel.open, .import-users-panel.open { display: flex; }
.user-form-actions, .user-list-actions { display: flex; align-items: center; gap: 9px; }
.panel-collapse-button { padding: 7px 9px; border: 1px solid #c8dcef; border-radius: 8px; color: #2865ad; background: #fff; font: inherit; font-size: .7rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
.panel-collapse-button:hover { background: #edf6ff; }
.import-panel-actions { display: flex; align-items: flex-end; gap: 9px; }
.mobile-close-button, .mobile-add-user { display: none; }
.user-form { display: flex; flex-direction: column; gap: 14px; }
.user-form label { display: flex; flex-direction: column; gap: 7px; color: #42628c; font-size: .78rem; font-weight: 700; }
.user-form input, .user-form select, .import-users-panel textarea, .import-users-panel input[type=file], .user-search input { width: 100%; border: 1px solid #d9e5f2; border-radius: 9px; padding: 11px 12px; color: #243f64; background: #f8fbff; font: inherit; }
.user-form .full-btn { display: flex; align-items: center; justify-content: center; gap: 5px; padding: 12px 16px; border-radius: 11px; background: linear-gradient(110deg, #2378db, #2251b5); box-shadow: 0 8px 16px rgba(35, 101, 199, .2); }
.user-fields-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.active-field { justify-content: end; }
.check-line { display: flex; align-items: center; gap: 8px; min-height: 42px; color: #43648d; font-weight: 500; }
.demo-field small { color: #7890ac; font-size: .68rem; font-weight: 400; line-height: 1.4; }
.scope-note { margin: 0; padding: 10px 12px; border: 1px solid #d9e5f2; border-radius: 9px; color: #42628c; background: #f8fbff; font-size: .78rem; font-weight: 700; }
.check-line input { width: auto; }
.text-button { border: 0; padding: 6px 0; color: #1d69c5; background: transparent; font: inherit; font-weight: 700; cursor: pointer; }
.import-users-panel .panel-heading > div { min-width: 0; }
.import-users-panel code { font-size: .72rem; white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
.import-mode-field { display: flex; min-width: 150px; flex-direction: column; gap: 5px; color: #6c83a0; font-size: .68rem; font-weight: 700; }
.import-mode-field select { padding: 8px 10px; border: 1px solid #d9e5f2; border-radius: 8px; color: #28558a; background: #f8fbff; font: inherit; font-size: .75rem; }
.hidden-file-input { display: none; }
.import-file-actions { display: flex; flex-direction: column; gap: 8px; }
.file-picker-button { display: flex; width: 100%; align-items: center; gap: 10px; padding: 12px; border: 1px dashed #9fc3ec; border-radius: 10px; color: #2865ad; background: #f1f7ff; font: inherit; text-align: left; cursor: pointer; }
.file-picker-button:hover { border-color: #2b72ce; background: #e9f3ff; }
.file-picker-button strong, .file-picker-button small { display: block; }.file-picker-button strong { font-size: .78rem; }.file-picker-button small { margin-top: 2px; color: #7890ac; font-size: .7rem; font-weight: 400; }
.action-icon { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 9px; color: #fff; background: #2c78d2; font-size: 1.1rem; font-weight: 800; }
.template-links { display: flex; align-items: center; gap: 8px; color: #7890ac; font-size: .72rem; }
.template-links a { padding: 4px 9px; border: 1px solid #c9dcef; border-radius: 999px; color: #246bc5; background: #fff; font-weight: 700; text-decoration: none; }
.template-links a:hover { border-color: #2b72ce; background: #edf6ff; }
.import-step { display: flex; align-items: flex-start; gap: 9px; color: #31577f; }.step-number { display: grid; width: 21px; height: 21px; flex: 0 0 auto; place-items: center; border-radius: 50%; color: #fff; background: #2c78d2; font-size: .68rem; font-weight: 800; }.import-step strong, .import-step small { display: block; }.import-step strong { font-size: .75rem; }.import-step small { margin-top: 2px; color: #8298b2; font-size: .68rem; font-weight: 400; }
.import-users-panel textarea { resize: vertical; font-family: monospace; font-size: .75rem; }
.import-users-panel input[type=file] { padding: 8px; font-size: .75rem; }
.import-actions, .user-search, .user-actions { display: flex; align-items: center; gap: 9px; }
.action-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 112px; }
.import-summary { padding: 11px; border-radius: 9px; background: #f1f7ff; color: #31577f; font-size: .78rem; }
.users-list-heading { align-items: flex-start; }
.user-panel-toggles { display: flex; gap: 7px; }
.panel-toggle-button { padding: 10px 12px; border: 0; border-radius: 9px; color: #fff; background: linear-gradient(110deg, #2378db, #2251b5); font: inherit; font-size: .75rem; font-weight: 800; cursor: pointer; white-space: nowrap; }
.panel-toggle-button.secondary { border: 1px solid #bed5ee; color: #2464ad; background: #f5f9ff; }
.user-search { position: relative; }.user-search input { width: min(220px, 100%); padding-left: 34px; }.search-icon { position: absolute; top: 50%; left: 11px; z-index: 1; color: #6d88aa; font-size: 1.25rem; line-height: 1; transform: translateY(-53%); pointer-events: none; }.search-button { padding: 10px 13px; border: 0; border-radius: 8px; color: #fff; background: #2b72ce; font: inherit; font-size: .76rem; font-weight: 700; cursor: pointer; }
.user-table-wrap { overflow-x: auto; }
.user-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
.user-table th, .user-table td { padding: 13px 10px; border-bottom: 1px solid #e6edf5; text-align: left; white-space: nowrap; }
.selection-column { width: 38px; text-align: center !important; }
.selection-column input { width: 16px; height: 16px; accent-color: #246bc5; cursor: pointer; }
.user-table th { color: #7890ac; font-size: .7rem; letter-spacing: .05em; text-transform: uppercase; }
.user-table td strong, .user-table td small { display: block; }
.user-table td small { margin-top: 3px; color: #8298b2; font-size: .72rem; }
.role-badge, .status-badge { display: inline-block; border-radius: 999px; padding: 5px 9px; color: #1b63b3; background: #eaf3ff; font-size: .7rem; font-weight: 700; }
.demo-badge { display: inline-block; border-radius: 999px; padding: 5px 9px; color: #765214; background: #fff2c9; font-size: .7rem; font-weight: 700; }
.status-badge { color: #17734c; background: #e9f8f0; }
.password-status-badge { display: inline-block; margin-top: 5px; border-radius: 999px; padding: 5px 9px; color: #93651b; background: #fff2cf; font-size: .7rem; font-weight: 700; }
.status-badge.inactive { color: #a55b2d; background: #fff1e7; }
.user-actions .danger-link { margin-left: 4px; }
.bulk-assignment-bar { display: grid; grid-template-columns: minmax(180px, 1.3fr) auto minmax(280px, 1fr) minmax(280px, 1fr); align-items: center; gap: 10px; padding: 12px; border: 1px solid #cfe0f3; border-radius: 12px; background: linear-gradient(110deg, #f4f9ff, #edf5ff); }
.danger-zone { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 13px 15px; border: 1px solid #f0c9c9; border-radius: 12px; background: linear-gradient(110deg, #fff8f8, #fff1f1); }.danger-zone strong, .danger-zone small { display: block; }.danger-zone strong { color: #9f3030; font-size: .8rem; }.danger-zone small { max-width: 650px; margin-top: 3px; color: #a86b6b; font-size: .7rem; line-height: 1.45; }.danger-zone-button { flex: 0 0 auto; padding: 9px 12px; border: 1px solid #e3a4a4; border-radius: 9px; color: #a13232; background: #fff; font: inherit; font-size: .72rem; font-weight: 800; cursor: pointer; }.danger-zone-button:hover:not(:disabled) { background: #fff0f0; }.danger-zone-button:disabled { cursor: wait; opacity: .6; }
.bulk-assignment-copy strong, .bulk-assignment-copy small { display: block; }.bulk-assignment-copy strong { color: #24558f; font-size: .8rem; }.bulk-assignment-copy small { margin-top: 3px; color: #7890ac; font-size: .7rem; }
.select-all-button { padding: 9px 11px; border: 1px solid #b9d2ef; border-radius: 9px; color: #2464ad; background: #fff; font: inherit; font-size: .72rem; font-weight: 700; cursor: pointer; }
.bulk-action-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; min-width: 0; }.bulk-action-row .ruas-select { min-width: 0; width: 100%; }.bulk-apply-button { min-width: 0; padding: 10px 14px; white-space: nowrap; }
@media (max-width: 820px) { .users-grid { grid-template-columns: 1fr; } }
@media (max-width: 720px) {
  .users-panel { gap: 14px; }
  .users-grid { display: flex; flex-direction: column; order: 2; gap: 14px; }
  .users-list-panel { order: 1; }
  .user-form-panel { display: none; }
  .user-form-panel.open { position: fixed; z-index: 45; inset: 0; display: flex; overflow-y: auto; padding: 0; border: 0; border-radius: 0; }
  .user-form-panel.open .panel-heading { position: sticky; z-index: 1; top: 0; padding: 17px 18px; background: #fff; }
  .user-form-panel.open .user-form { padding: 18px; padding-bottom: 32px; }
  .mobile-close-button { display: block; width: 30px; height: 30px; border: 0; border-radius: 50%; color: #58718e; background: #edf3fa; font-size: 1.3rem; line-height: 1; cursor: pointer; }
  .users-list-heading { flex-direction: column; gap: 13px; }
  .user-list-actions { width: 100%; align-items: stretch; flex-direction: column; }
  .user-search { width: 100%; }
  .user-search input { flex: 1; width: auto; }
  .search-button { min-width: 58px; }
  .mobile-add-user { display: block; width: 100%; padding: 10px 14px; border: 0; border-radius: 9px; color: #fff; background: linear-gradient(110deg, #2378db, #2251b5); font: inherit; font-size: .8rem; font-weight: 700; cursor: pointer; }
  .user-panel-toggles { width: 100%; display: grid; grid-template-columns: 1fr 1fr; }
  .panel-toggle-button { width: 100%; }
  .import-users-panel.open { display: flex; }
  .import-users-panel .panel-heading { align-items: flex-start; flex-direction: column; }
  .import-panel-actions { width: 100%; align-items: stretch; flex-direction: column; }
  .import-panel-actions .panel-collapse-button { align-self: flex-start; }
  .import-mode-field { width: 100%; }
  .template-links { justify-content: flex-end; }
  .import-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .action-btn { width: 100%; min-width: 0; }
  .user-table-wrap { overflow: visible; }
  .user-table, .user-table tbody, .user-table tr, .user-table td { display: block; }
  .user-table thead { display: none; }
  .user-table tr { display: grid; grid-template-columns: 25px minmax(0, 1fr) auto; grid-template-areas: 'select identity status' 'select assignment assignment' 'select actions actions'; column-gap: 8px; row-gap: 8px; margin-bottom: 9px; padding: 13px; border: 1px solid #e1eaf4; border-radius: 14px; background: #fbfdff; }
  .user-table td { display: block; padding: 0; border: 0; white-space: normal; }
  .user-table td.selection-column { grid-area: select; width: auto; padding-top: 2px; }
  .user-table td.user-identity { grid-area: identity; min-width: 0; }
  .user-table td.user-assignment { display: flex; flex-wrap: wrap; grid-area: assignment; align-items: center; gap: 5px 10px; padding-left: 0; }
  .user-table td.user-assignment small { margin: 0; color: #7890ac; }
  .user-table td.user-status { grid-area: status; padding-top: 1px; }
  .user-table td.user-actions { display: flex; grid-area: actions; justify-content: flex-start; gap: 14px; padding-top: 9px; border-top: 1px solid #e8eff6; }
  .user-table td.user-identity strong { overflow: hidden; color: #234d87; text-overflow: ellipsis; white-space: nowrap; }
  .user-table td.user-identity small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .import-users-panel { order: 2; }
  .bulk-assignment-bar { grid-template-columns: 1fr 1fr; }
  .danger-zone { align-items: stretch; flex-direction: column; }
  .danger-zone-button { width: 100%; }
  .bulk-assignment-copy { grid-column: 1 / -1; }
  .bulk-action-row { grid-column: 1 / -1; }.bulk-action-row .ruas-select { width: 100%; }.bulk-action-row .bulk-apply-button { width: auto; }
}
@media (max-width: 560px) { .user-fields-row { grid-template-columns: 1fr; } }
</style>
