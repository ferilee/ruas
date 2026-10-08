<template>
  <section class="users-panel">
    <div class="users-grid">
      <div class="panel user-form-panel">
        <div class="panel-heading">
          <div>
            <h2>{{ editingId === null ? 'Tambah pengguna' : `Edit pengguna #${editingId}` }}</h2>
            <p>Akun peserta dan editor disimpan aman di database.</p>
          </div>
          <button v-if="editingId !== null" class="text-button" type="button" @click="resetForm">Batal</button>
        </div>
        <form class="user-form" @submit.prevent="saveUser">
          <label>Username<input v-model.trim="form.username" required autocomplete="off" placeholder="Contoh: P130100230" /></label>
          <label>Nama tampilan<input v-model.trim="form.display_name" required placeholder="Nama peserta" /></label>
          <label>Password {{ editingId === null ? '' : '(kosongkan jika tidak diubah)' }}<input v-model="form.password" :required="editingId === null" type="password" autocomplete="new-password" placeholder="Password akun" /></label>
          <div class="user-fields-row">
            <label>Peran<select v-model="form.role"><option value="participant">Peserta</option><option value="editor">Editor</option><option value="admin">Admin</option></select></label>
            <label class="active-field"><span>Status</span><span class="check-line"><input v-model="form.active" type="checkbox" /> Aktif</span></label>
          </div>
          <p v-if="formMessage" :class="formMessageType === 'error' ? 'error-text' : 'success-text'">{{ formMessage }}</p>
          <button class="primary-btn full-btn" type="submit" :disabled="saving">{{ saving ? 'Menyimpan...' : editingId === null ? 'Tambah Pengguna' : 'Simpan Perubahan' }}</button>
        </form>
      </div>

      <div class="panel import-users-panel">
        <div class="panel-heading">
          <div><h2>Import pengguna</h2><p>CSV: <code>username,password,display_name,role,active</code></p></div>
          <select v-model="importMode" aria-label="Mode import"><option value="insert">Tambah baru</option><option value="upsert">Tambah atau perbarui</option></select>
        </div>
        <input ref="fileInput" type="file" accept=".csv,.json,application/json,text/csv" @change="readFile" />
        <textarea v-model="importText" rows="7" placeholder="Tempel CSV atau JSON di sini..." spellcheck="false"></textarea>
        <div class="import-actions"><button class="secondary-btn" type="button" :disabled="importing || !importText.trim()" @click="previewImport">Preview</button><button class="primary-btn" type="button" :disabled="importing || !parsedImport" @click="applyImport">Terapkan</button></div>
        <div v-if="importSummary" class="import-summary"><strong>{{ importSummary.inserted }} baru · {{ importSummary.updated }} diperbarui · {{ importSummary.skipped }} dilewati</strong><p v-for="error in importSummary.errors" :key="error" class="error-text">{{ error }}</p></div>
      </div>
    </div>

    <div class="panel users-list-panel">
      <div class="panel-heading users-list-heading"><div><h2>Daftar pengguna</h2><p>{{ users.length }} akun ditemukan.</p></div><div class="user-search"><input v-model="search" placeholder="Cari username atau nama" @keyup.enter="loadUsers" /><button class="secondary-btn" type="button" @click="loadUsers">Cari</button></div></div>
      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <div v-if="loading" class="panel-empty">Memuat pengguna...</div>
      <div v-else-if="users.length === 0" class="panel-empty">Belum ada pengguna.</div>
      <div v-else class="user-table-wrap"><table class="user-table"><thead><tr><th>Pengguna</th><th>Peran</th><th>Status</th><th>Aksi</th></tr></thead><tbody><tr v-for="user in users" :key="user.id"><td><strong>{{ user.display_name }}</strong><small>{{ user.username }}</small></td><td><span class="role-badge">{{ roleLabel(user.role) }}</span></td><td><span :class="['status-badge', { inactive: !user.active }]">{{ user.active ? 'Aktif' : 'Nonaktif' }}</span></td><td class="user-actions"><button class="text-button" type="button" @click="editUser(user)">Edit</button><button class="danger-link" type="button" @click="removeUser(user)">Hapus</button></td></tr></tbody></table></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { createAdminUser, deleteAdminUser, fetchAdminUsers, importAdminUsers, updateAdminUser } from '@/api/client';
import type { AdminUser, AdminUserInput, UserImportSummary, UserRole } from '@/types';

const users = ref<AdminUser[]>([]);
const loading = ref(false);
const saving = ref(false);
const importing = ref(false);
const errorMessage = ref('');
const formMessage = ref('');
const formMessageType = ref<'success' | 'error'>('success');
const editingId = ref<number | null>(null);
const search = ref('');
const importText = ref('');
const parsedImport = ref<unknown>(null);
const importMode = ref<'insert' | 'upsert'>('insert');
const importSummary = ref<UserImportSummary | null>(null);
const form = reactive<AdminUserInput>({ username: '', password: '', display_name: '', role: 'participant', active: true });

function resetForm() { Object.assign(form, { username: '', password: '', display_name: '', role: 'participant', active: true }); editingId.value = null; formMessage.value = ''; }
function editUser(user: AdminUser) { Object.assign(form, { username: user.username, password: '', display_name: user.display_name, role: user.role, active: user.active }); editingId.value = user.id; formMessage.value = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); }
async function loadUsers() { loading.value = true; errorMessage.value = ''; try { users.value = await fetchAdminUsers(search.value); } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat pengguna.'; } finally { loading.value = false; } }
async function saveUser() { saving.value = true; formMessage.value = ''; const currentId = editingId.value; try { const input = { ...form }; if (currentId === null) await createAdminUser(input); else await updateAdminUser(currentId, input); formMessageType.value = 'success'; resetForm(); formMessage.value = currentId === null ? 'Pengguna berhasil ditambahkan.' : 'Pengguna berhasil diperbarui.'; await loadUsers(); } catch (error) { formMessageType.value = 'error'; formMessage.value = error instanceof Error ? error.message : 'Gagal menyimpan pengguna.'; } finally { saving.value = false; } }
async function removeUser(user: AdminUser) { if (!window.confirm(`Hapus pengguna ${user.username}?`)) return; try { await deleteAdminUser(user.id); await loadUsers(); } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Gagal menghapus pengguna.'; } }
async function readFile(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (file) importText.value = await file.text(); }
function parseImportText() { const value = importText.value.trim(); try { parsedImport.value = JSON.parse(value); } catch { parsedImport.value = value; } }
async function previewImport() { parseImportText(); importing.value = true; try { importSummary.value = await importAdminUsers(parsedImport.value, importMode.value, true); } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Import tidak valid.'; } finally { importing.value = false; } }
async function applyImport() { if (parsedImport.value === null || !window.confirm('Terapkan import pengguna ini?')) return; importing.value = true; try { importSummary.value = await importAdminUsers(parsedImport.value, importMode.value, false); await loadUsers(); } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Gagal menerapkan import.'; } finally { importing.value = false; } }
function roleLabel(role: UserRole) { return { admin: 'Admin', editor: 'Editor', participant: 'Peserta' }[role]; }
onMounted(loadUsers);
</script>

<style scoped>
.users-panel { display: flex; flex-direction: column; gap: 20px; }
.users-grid { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); gap: 20px; }
.user-form-panel, .import-users-panel { display: flex; flex-direction: column; gap: 14px; }
.user-form { display: flex; flex-direction: column; gap: 14px; }
.user-form label { display: flex; flex-direction: column; gap: 7px; color: #42628c; font-size: .78rem; font-weight: 700; }
.user-form input, .user-form select, .import-users-panel textarea, .import-users-panel input[type=file], .user-search input { width: 100%; border: 1px solid #d9e5f2; border-radius: 9px; padding: 11px 12px; color: #243f64; background: #f8fbff; font: inherit; }
.user-fields-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.active-field { justify-content: end; }
.check-line { display: flex; align-items: center; gap: 8px; min-height: 42px; color: #43648d; font-weight: 500; }
.check-line input { width: auto; }
.text-button { border: 0; padding: 6px 0; color: #1d69c5; background: transparent; font: inherit; font-weight: 700; cursor: pointer; }
.import-users-panel code { font-size: .72rem; }
.import-users-panel textarea { resize: vertical; font-family: monospace; font-size: .75rem; }
.import-users-panel input[type=file] { padding: 8px; font-size: .75rem; }
.import-actions, .user-search, .user-actions { display: flex; align-items: center; gap: 9px; }
.import-summary { padding: 11px; border-radius: 9px; background: #f1f7ff; color: #31577f; font-size: .78rem; }
.users-list-heading { align-items: flex-start; }
.user-search input { width: min(220px, 100%); }
.user-table-wrap { overflow-x: auto; }
.user-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
.user-table th, .user-table td { padding: 13px 10px; border-bottom: 1px solid #e6edf5; text-align: left; white-space: nowrap; }
.user-table th { color: #7890ac; font-size: .7rem; letter-spacing: .05em; text-transform: uppercase; }
.user-table td strong, .user-table td small { display: block; }
.user-table td small { margin-top: 3px; color: #8298b2; font-size: .72rem; }
.role-badge, .status-badge { display: inline-block; border-radius: 999px; padding: 5px 9px; color: #1b63b3; background: #eaf3ff; font-size: .7rem; font-weight: 700; }
.status-badge { color: #17734c; background: #e9f8f0; }
.status-badge.inactive { color: #a55b2d; background: #fff1e7; }
.user-actions .danger-link { margin-left: 4px; }
@media (max-width: 820px) { .users-grid { grid-template-columns: 1fr; } }
@media (max-width: 560px) { .user-fields-row { grid-template-columns: 1fr; } .users-list-heading { flex-direction: column; } .user-search { width: 100%; } .user-search input { flex: 1; width: auto; } }
</style>
