<template>
  <Teleport to="body">
    <div v-if="open" class="confirm-backdrop" @click.self="$emit('cancel')">
      <section class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <div class="confirm-icon" aria-hidden="true">!</div>
        <div class="confirm-content">
          <h2 id="confirm-title">{{ title }}</h2>
          <p id="confirm-message">{{ message }}</p>
          <label v-if="confirmationPhrase" class="confirmation-field">
            <span>Ketik konfirmasi</span>
            <input v-model="confirmationValue" :placeholder="confirmationPlaceholder || confirmationPhrase" autocomplete="off" @keyup.enter="canConfirm && $emit('confirm')" />
          </label>
        </div>
        <div class="confirm-actions">
          <button class="confirm-cancel" type="button" @click="$emit('cancel')">{{ cancelLabel }}</button>
          <button class="confirm-submit" type="button" :disabled="!canConfirm" @click="$emit('confirm')">{{ confirmLabel }}</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmationPhrase?: string;
  confirmationPlaceholder?: string;
}>(), { confirmLabel: 'OK', cancelLabel: 'Batal', confirmationPlaceholder: '' });

const confirmationValue = ref('');
const canConfirm = computed(() => !props.confirmationPhrase || confirmationValue.value.trim() === props.confirmationPhrase);
watch(() => props.open, (open) => {
  if (open) confirmationValue.value = '';
});

defineEmits<{ confirm: []; cancel: [] }>();
</script>

<style scoped>
.confirm-backdrop { position: fixed; z-index: 100; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(13, 35, 69, .48); backdrop-filter: blur(4px); }
.confirm-dialog { width: min(430px, 100%); padding: 24px; border: 1px solid rgba(255,255,255,.9); border-radius: 20px; background: linear-gradient(145deg, #fff, #f4f8ff); box-shadow: 0 24px 60px rgba(18, 55, 104, .28); }
.confirm-icon { display: grid; width: 42px; height: 42px; margin-bottom: 15px; place-items: center; border-radius: 13px; color: #fff; background: linear-gradient(145deg, #398de5, #2251b5); font-size: 1.25rem; font-weight: 800; box-shadow: 0 8px 16px rgba(35, 101, 199, .2); }
.confirm-content h2 { color: #173e7f; font-size: 1.05rem; }.confirm-content p { margin-top: 8px; color: #5d7391; font-size: .84rem; line-height: 1.55; }
.confirmation-field { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; color: #476482; font-size: .75rem; font-weight: 800; }.confirmation-field input { width: 100%; padding: 10px 11px; border: 1px solid #cadced; border-radius: 9px; color: #243f64; background: #f8fbff; font: inherit; }.confirmation-field input:focus { outline: 2px solid rgba(43, 114, 206, .25); border-color: #2b72ce; }
.confirm-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 22px; }.confirm-actions button { padding: 10px 16px; border-radius: 9px; font: inherit; font-size: .78rem; font-weight: 800; cursor: pointer; }.confirm-cancel { border: 1px solid #d4e1ef; color: #476482; background: #fff; }.confirm-submit { border: 0; color: #fff; background: linear-gradient(110deg, #2378db, #2251b5); box-shadow: 0 7px 14px rgba(35, 101, 199, .2); }
.confirm-submit:disabled { cursor: not-allowed; opacity: .48; box-shadow: none; }
@media (max-width: 520px) { .confirm-dialog { padding: 20px; border-radius: 17px; }.confirm-actions { display: grid; grid-template-columns: 1fr 1fr; }.confirm-actions button { width: 100%; } }

:global(html[data-ruas-theme="light"]) .confirm-backdrop { background: rgba(31, 58, 91, .24); }
:global(html[data-ruas-theme="light"]) .confirm-dialog { border-color: #d7e2ee; color: #1d3557; background: #fff; box-shadow: 0 24px 60px rgba(31, 74, 126, .2); }
:global(html[data-ruas-theme="light"]) .confirm-content h2 { color: #173e7f; }
:global(html[data-ruas-theme="light"]) .confirm-content p { color: #71849b; }
:global(html[data-ruas-theme="light"]) .confirmation-field { color: #435d7d; }
:global(html[data-ruas-theme="light"]) .confirmation-field input { border-color: #d4dde6; color: #294c7a; background: #f9fbfe; }
:global(html[data-ruas-theme="light"]) .confirm-cancel { border-color: #d4e1ef; color: #476482; background: #fff; }
</style>
