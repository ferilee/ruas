<template>
  <section class="teacher-requests-panel panel">
    <div class="requests-heading">
      <div>
        <span class="requests-eyebrow">AKSES GURU</span>
        <h2>Pengajuan guru</h2>
        <p>Tinjau pengajuan sebelum membuat akun Editor.</p>
      </div>
      <div class="requests-toolbar">
        <RuasSelect v-model="status" :options="statusOptions" aria-label="Filter status pengajuan" />
        <button type="button" class="secondary-btn" :disabled="loading" @click="loadRequests">Muat ulang</button>
      </div>
    </div>
    <p class="request-hint">Saat disetujui, akun dibuat sebagai Editor dan wajib mengganti sandi awal pada login pertama.</p>
    <p v-if="errorMessage" class="error-text" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-text" role="status">{{ successMessage }}</p>
    <div v-if="loading" class="requests-empty">Memuat pengajuan...</div>
    <div v-else-if="requests.length === 0" class="requests-empty">Belum ada pengajuan pada filter ini.</div>
    <div v-else class="request-list">
      <article v-for="request in requests" :key="request.id" class="request-card">
        <div class="request-card-main">
          <div class="request-card-heading"><h3>{{ request.display_name }}</h3><span :class="['request-status', `status-${request.status}`]">{{ statusLabel(request.status) }}</span></div>
          <p class="request-username">@{{ request.username }}</p>
          <dl class="request-details">
            <div v-if="request.contact"><dt>Kontak</dt><dd>{{ request.contact }}</dd></div>
            <div v-if="request.requested_class"><dt>Kelas</dt><dd>{{ request.requested_class }}</dd></div>
            <div v-if="request.requested_subject"><dt>Mata pelajaran</dt><dd>{{ request.requested_subject }}</dd></div>
            <div><dt>Diajukan</dt><dd>{{ formatDate(request.created_at) }}</dd></div>
          </dl>
          <p v-if="request.status === 'rejected' && request.rejection_reason" class="request-reason">Alasan: {{ request.rejection_reason }}</p>
        </div>
        <div v-if="request.status === 'pending'" class="request-actions">
          <button type="button" class="approve-btn" :disabled="processingId === request.id" @click="review(request.id, 'approve')">{{ processingId === request.id ? 'Memproses...' : 'Setujui & buat Editor' }}</button>
          <input v-model.trim="rejectionReasons[request.id]" class="reject-reason-input" maxlength="500" placeholder="Alasan penolakan" aria-label="Alasan penolakan" />
          <button type="button" class="reject-btn" :disabled="processingId === request.id" @click="review(request.id, 'reject')">Tolak</button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import RuasSelect from '@/components/RuasSelect.vue';
import { fetchAdminTeacherAccessRequests, reviewAdminTeacherAccessRequest } from '@/api/client';
import type { TeacherAccessRequest, TeacherAccessRequestStatus } from '@/types';
import { ADMIN_REALTIME_EVENT, type AdminRealtimeEvent } from '@/lib/admin-realtime';

const status = ref<TeacherAccessRequestStatus | 'all'>('pending');
const requests = ref<TeacherAccessRequest[]>([]);
const rejectionReasons = reactive<Record<number, string>>({});
const loading = ref(false);
const processingId = ref<number | null>(null);
const errorMessage = ref('');
const successMessage = ref('');
const statusOptions = [
  { value: 'pending', label: 'Menunggu persetujuan' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'all', label: 'Semua status' },
];

function statusLabel(value: TeacherAccessRequestStatus) { return { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' }[value]; }
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
async function loadRequests() {
  loading.value = true;
  errorMessage.value = '';
  try { requests.value = await fetchAdminTeacherAccessRequests(status.value); }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat pengajuan guru.'; }
  finally { loading.value = false; }
}
async function review(id: number, action: 'approve' | 'reject') {
  const reason = rejectionReasons[id] ?? '';
  if (action === 'reject' && !reason) { errorMessage.value = 'Isi alasan penolakan terlebih dahulu.'; return; }
  processingId.value = id;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    await reviewAdminTeacherAccessRequest(id, action, reason);
    successMessage.value = action === 'approve' ? 'Pengajuan disetujui dan akun Editor dibuat.' : 'Pengajuan ditolak.';
    await loadRequests();
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Pengajuan gagal diproses.'; }
  finally { processingId.value = null; }
}
function handleRealtime(event: Event) {
  const detail = (event as CustomEvent<AdminRealtimeEvent>).detail;
  if (detail?.resource === 'teacher-requests') void loadRequests();
}
watch(status, loadRequests);
onMounted(() => { void loadRequests(); window.addEventListener(ADMIN_REALTIME_EVENT, handleRealtime); });
onUnmounted(() => window.removeEventListener(ADMIN_REALTIME_EVENT, handleRealtime));
</script>

<style scoped>
.teacher-requests-panel { display: flex; flex-direction: column; gap: 15px; }
.requests-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.requests-eyebrow { color: #1e40af; font-size: .64rem; font-weight: 800; letter-spacing: .14em; }.requests-heading h2 { margin-top: 4px; color: #1e40af; font-size: 1.2rem; }.requests-heading p { margin-top: 4px; color: #7188a5; font-size: .8rem; }
.requests-toolbar { display: flex; align-items: center; gap: 8px; }.requests-toolbar :deep(.ruas-select) { min-width: 190px; }
.request-hint { padding: 10px 12px; border-radius: 9px; color: #496482; background: #f1f6ff; font-size: .75rem; line-height: 1.45; }
.request-list { display: flex; flex-direction: column; gap: 10px; }.request-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 15px; border: 1px solid #dae6f2; border-radius: 12px; background: #fbfdff; }
.request-card-heading { display: flex; align-items: center; gap: 9px; }.request-card-heading h3 { color: #274d80; font-size: .9rem; }.request-username { margin-top: 3px; color: #7890ac; font-size: .75rem; }
.request-status { padding: 4px 8px; border-radius: 999px; font-size: .65rem; font-weight: 800; }.status-pending { color: #9b6811; background: #fff1cc; }.status-approved { color: #21754e; background: #ddf6e9; }.status-rejected { color: #a83b4b; background: #ffe5e8; }
.request-details { display: flex; flex-wrap: wrap; gap: 10px 20px; margin-top: 11px; }.request-details div { display: flex; gap: 5px; font-size: .7rem; }.request-details dt { color: #8a9bb0; }.request-details dd { color: #486384; font-weight: 700; }.request-reason { margin-top: 10px; color: #a83b4b; font-size: .74rem; }
.request-actions { display: grid; min-width: 220px; gap: 7px; }.request-actions button { padding: 8px 10px; border: 0; border-radius: 8px; font: inherit; font-size: .72rem; font-weight: 800; cursor: pointer; }.approve-btn { color: #fff; background: #1e40af; }.reject-btn { color: #a83b4b; background: #ffe9ec; }.reject-reason-input { width: 100%; padding: 8px 9px; border: 1px solid #d4dde6; border-radius: 8px; font: inherit; font-size: .72rem; }.request-actions button:disabled { cursor: wait; opacity: .6; }
.requests-empty { padding: 28px; border: 1px dashed #cbdbea; border-radius: 12px; color: #7890ac; text-align: center; font-size: .8rem; }.error-text { color: #b6404c; font-size: .78rem; }.success-text { color: #277653; font-size: .78rem; }
@media (max-width: 700px) { .requests-heading { flex-direction: column; }.requests-toolbar { width: 100%; }.requests-toolbar :deep(.ruas-select) { flex: 1; min-width: 0; }.request-card { flex-direction: column; }.request-actions { width: 100%; min-width: 0; } }
</style>
