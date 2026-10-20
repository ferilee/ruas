<template>
  <section class="feedback-panel">
    <template v-if="mode === 'submit'">
      <div class="feedback-intro">
        <strong>Bagikan masukan Anda</strong>
        <p>Saran membantu kami memperbaiki RUAS. Testimoni yang Anda izinkan akan ditinjau Admin sebelum ditampilkan di halaman Tentang.</p>
      </div>
      <div class="feedback-kind-tabs" role="tablist" aria-label="Jenis masukan">
        <button v-for="option in kindOptions" :key="option.value" type="button" :class="{ active: kind === option.value }" @click="kind = option.value">{{ option.label }}</button>
      </div>
      <form class="feedback-form" @submit.prevent="submit">
        <label>Nama yang ditampilkan<input v-model.trim="displayName" required maxlength="150" /></label>
        <label>Peran<input v-model.trim="roleLabel" required maxlength="100" /></label>
        <label>{{ kind === 'suggestion' ? 'Saran atau kendala' : 'Testimoni' }}<textarea v-model.trim="message" rows="6" required maxlength="3000" :placeholder="kind === 'suggestion' ? 'Ceritakan saran, kendala, atau ide Anda...' : 'Ceritakan pengalaman Anda menggunakan RUAS...'" /></label>
        <label v-if="kind === 'testimonial'" class="feedback-consent"><input v-model="consentPublic" type="checkbox" /> <span>Saya mengizinkan testimoni ini ditampilkan di halaman Tentang setelah disetujui Admin.</span></label>
        <p v-if="messageText" :class="messageType" role="status">{{ messageText }}</p>
        <button class="feedback-submit" type="submit" :disabled="saving">{{ saving ? 'Mengirim...' : kind === 'suggestion' ? 'Kirim saran' : 'Kirim testimoni' }}</button>
      </form>
    </template>

    <template v-else>
      <div class="feedback-manage-toolbar">
        <div><strong>Antrean masukan</strong><p>Tinjau testimoni sebelum ditampilkan publik.</p></div>
        <select v-model="status" aria-label="Filter status masukan"><option value="pending">Menunggu</option><option value="approved">Disetujui</option><option value="rejected">Ditolak</option><option value="all">Semua</option></select>
      </div>
      <p v-if="messageText" :class="messageType" role="status">{{ messageText }}</p>
      <div v-if="loading" class="feedback-empty">Memuat masukan...</div>
      <div v-else-if="entries.length === 0" class="feedback-empty">Belum ada masukan pada filter ini.</div>
      <div v-else class="feedback-list">
        <article v-for="entry in entries" :key="entry.id" class="feedback-entry">
          <div class="feedback-entry-heading"><span :class="['feedback-kind-badge', entry.kind]">{{ entry.kind === 'suggestion' ? 'Saran' : 'Testimoni' }}</span><span>{{ statusLabel(entry.status) }}</span></div>
          <p class="feedback-entry-message">“{{ entry.message }}”</p>
          <p class="feedback-entry-author">{{ entry.display_name }} · {{ entry.role_label }}</p>
          <div v-if="entry.status === 'pending'" class="feedback-entry-actions">
            <button type="button" class="feedback-approve" :disabled="processingId === entry.id" @click="review(entry.id, 'approve')">Setujui</button>
            <input v-model.trim="rejectionReasons[entry.id]" maxlength="500" placeholder="Alasan penolakan" :aria-label="`Alasan penolakan untuk ${entry.display_name}`" />
            <button type="button" class="feedback-reject" :disabled="processingId === entry.id" @click="review(entry.id, 'reject')">Tolak</button>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { fetchAdminFeedback, reviewAdminFeedback, submitAdminFeedback } from '@/api/client';
import type { AdminSession, FeedbackEntry, FeedbackKind, FeedbackStatus } from '@/types';

const props = withDefaults(defineProps<{ mode: 'submit' | 'manage'; session?: AdminSession | null; initialKind?: FeedbackKind }>(), { session: null, initialKind: 'suggestion' });
const kind = ref<FeedbackKind>(props.initialKind);
const displayName = ref(props.session?.display_name ?? '');
const roleLabel = ref(props.session?.role === 'admin' ? 'Admin' : 'Guru');
const message = ref('');
const consentPublic = ref(false);
const saving = ref(false);
const messageText = ref('');
const messageType = ref<'success-text' | 'error-text'>('success-text');
const status = ref<FeedbackStatus | 'all'>('pending');
const entries = ref<FeedbackEntry[]>([]);
const loading = ref(false);
const processingId = ref<number | null>(null);
const rejectionReasons = reactive<Record<number, string>>({});
const kindOptions: Array<{ value: FeedbackKind; label: string }> = [
  { value: 'suggestion', label: 'Kirim saran' },
  { value: 'testimonial', label: 'Bagikan pengalaman' },
];

async function submit() {
  if (kind.value === 'testimonial' && !consentPublic.value) {
    messageType.value = 'error-text';
    messageText.value = 'Aktifkan persetujuan publik untuk mengirim testimoni.';
    return;
  }
  saving.value = true;
  messageText.value = '';
  try {
    await submitAdminFeedback({ kind: kind.value, message: message.value, display_name: displayName.value, role_label: roleLabel.value, consent_public: consentPublic.value });
    messageType.value = 'success-text';
    messageText.value = kind.value === 'suggestion' ? 'Saran berhasil dikirim. Terima kasih.' : 'Testimoni dikirim dan menunggu tinjauan Admin.';
    message.value = '';
    consentPublic.value = false;
  } catch (error) {
    messageType.value = 'error-text';
    messageText.value = error instanceof Error ? error.message : 'Masukan gagal dikirim.';
  } finally { saving.value = false; }
}

function statusLabel(value: FeedbackStatus) { return { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' }[value]; }

async function loadEntries() {
  if (props.mode !== 'manage') return;
  loading.value = true;
  messageText.value = '';
  try { entries.value = await fetchAdminFeedback(status.value); }
  catch (error) { messageType.value = 'error-text'; messageText.value = error instanceof Error ? error.message : 'Masukan gagal dimuat.'; }
  finally { loading.value = false; }
}

async function review(id: number, action: 'approve' | 'reject') {
  const reason = rejectionReasons[id] ?? '';
  if (action === 'reject' && !reason) { messageType.value = 'error-text'; messageText.value = 'Isi alasan penolakan terlebih dahulu.'; return; }
  processingId.value = id;
  try {
    await reviewAdminFeedback(id, action, reason);
    messageType.value = 'success-text';
    messageText.value = action === 'approve' ? 'Masukan disetujui.' : 'Masukan ditolak.';
    await loadEntries();
  } catch (error) { messageType.value = 'error-text'; messageText.value = error instanceof Error ? error.message : 'Moderasi gagal diproses.'; }
  finally { processingId.value = null; }
}

watch(status, () => void loadEntries());
onMounted(() => void loadEntries());
</script>

<style scoped>
.feedback-panel { display: flex; flex-direction: column; gap: 16px; color: #294c7a; }
.feedback-intro { padding: 13px 14px; border: 1px solid #d9e5f2; border-radius: 11px; background: #f8fbff; }.feedback-intro strong, .feedback-manage-toolbar strong { color: #173e7f; font-size: .88rem; }.feedback-intro p, .feedback-manage-toolbar p { margin-top: 4px; color: #71849b; font-size: .75rem; line-height: 1.5; }
.feedback-kind-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; padding: 4px; border: 1px solid #d9e5f2; border-radius: 10px; background: #f2f7fc; }.feedback-kind-tabs button { padding: 9px; border: 0; border-radius: 7px; color: #6b809d; background: transparent; font: inherit; font-size: .74rem; font-weight: 800; cursor: pointer; }.feedback-kind-tabs button.active { color: #fff; background: #287bd7; }
.feedback-form { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }.feedback-form label:not(.feedback-consent) { display: flex; flex-direction: column; grid-column: span 1; gap: 6px; color: #435d7d; font-size: .75rem; font-weight: 700; }.feedback-form label:nth-of-type(3) { grid-column: 1 / -1; }.feedback-form input, .feedback-form textarea, .feedback-manage-toolbar select, .feedback-entry-actions input { width: 100%; padding: 10px 11px; border: 1px solid #d4e0ee; border-radius: 8px; color: #294c7a; background: #f9fbfe; font: inherit; font-size: .8rem; }.feedback-form textarea { resize: vertical; }.feedback-consent { display: flex; grid-column: 1 / -1; align-items: flex-start; gap: 8px; color: #5e7592; font-size: .73rem; line-height: 1.45; }.feedback-consent input { width: 16px; flex: 0 0 16px; margin-top: 1px; accent-color: #287bd7; }.feedback-submit { grid-column: 1 / -1; padding: 11px 14px; border: 0; border-radius: 9px; color: #fff; background: #287bd7; font: inherit; font-size: .78rem; font-weight: 800; cursor: pointer; }.feedback-submit:disabled, .feedback-entry-actions button:disabled { cursor: wait; opacity: .6; }.success-text, .error-text { margin: 0; font-size: .76rem; }.success-text { color: #277653; }.error-text { color: #b6404c; }
.feedback-manage-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }.feedback-manage-toolbar select { width: auto; min-width: 135px; }.feedback-empty { padding: 28px 16px; border: 1px dashed #cbdbea; border-radius: 11px; color: #7890aa; text-align: center; font-size: .8rem; }.feedback-list { display: flex; flex-direction: column; gap: 10px; }.feedback-entry { padding: 14px; border: 1px solid #dfe8f2; border-radius: 11px; background: #fff; }.feedback-entry-heading { display: flex; justify-content: space-between; gap: 8px; color: #8498b1; font-size: .68rem; }.feedback-kind-badge { padding: 4px 7px; border-radius: 999px; color: #315f9c; background: #edf5ff; font-weight: 800; }.feedback-kind-badge.testimonial { color: #7650b6; background: #f0eaff; }.feedback-entry-message { margin-top: 10px; color: #315987; font-size: .82rem; line-height: 1.55; }.feedback-entry-author { margin-top: 8px; color: #8498b1; font-size: .7rem; font-weight: 700; }.feedback-entry-actions { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 7px; margin-top: 12px; }.feedback-entry-actions button { padding: 8px 11px; border: 0; border-radius: 8px; font: inherit; font-size: .7rem; font-weight: 800; cursor: pointer; }.feedback-approve { color: #fff; background: #287bd7; }.feedback-reject { color: #a83b4b; background: #ffe9ec; }
@media (max-width: 560px) { .feedback-form { grid-template-columns: 1fr; }.feedback-form label:not(.feedback-consent), .feedback-form label:nth-of-type(3) { grid-column: auto; }.feedback-consent, .feedback-submit { grid-column: auto; }.feedback-manage-toolbar { align-items: stretch; flex-direction: column; }.feedback-manage-toolbar select { width: 100%; }.feedback-entry-actions { grid-template-columns: 1fr 1fr; }.feedback-entry-actions input { grid-column: 1 / -1; order: -1; } }
</style>
