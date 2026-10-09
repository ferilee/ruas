<template>
  <Teleport to="body">
    <div v-if="open" class="confirm-backdrop" @click.self="$emit('cancel')">
      <section class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <div class="confirm-icon" aria-hidden="true">!</div>
        <div class="confirm-content">
          <h2 id="confirm-title">{{ title }}</h2>
          <p id="confirm-message">{{ message }}</p>
        </div>
        <div class="confirm-actions">
          <button class="confirm-cancel" type="button" @click="$emit('cancel')">{{ cancelLabel }}</button>
          <button class="confirm-submit" type="button" @click="$emit('confirm')">{{ confirmLabel }}</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}>(), { confirmLabel: 'OK', cancelLabel: 'Batal' });

defineEmits<{ confirm: []; cancel: [] }>();
</script>

<style scoped>
.confirm-backdrop { position: fixed; z-index: 100; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(13, 35, 69, .48); backdrop-filter: blur(4px); }
.confirm-dialog { width: min(430px, 100%); padding: 24px; border: 1px solid rgba(255,255,255,.9); border-radius: 20px; background: linear-gradient(145deg, #fff, #f4f8ff); box-shadow: 0 24px 60px rgba(18, 55, 104, .28); }
.confirm-icon { display: grid; width: 42px; height: 42px; margin-bottom: 15px; place-items: center; border-radius: 13px; color: #fff; background: linear-gradient(145deg, #398de5, #2251b5); font-size: 1.25rem; font-weight: 800; box-shadow: 0 8px 16px rgba(35, 101, 199, .2); }
.confirm-content h2 { color: #173e7f; font-size: 1.05rem; }.confirm-content p { margin-top: 8px; color: #5d7391; font-size: .84rem; line-height: 1.55; }
.confirm-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 22px; }.confirm-actions button { padding: 10px 16px; border-radius: 9px; font: inherit; font-size: .78rem; font-weight: 800; cursor: pointer; }.confirm-cancel { border: 1px solid #d4e1ef; color: #476482; background: #fff; }.confirm-submit { border: 0; color: #fff; background: linear-gradient(110deg, #2378db, #2251b5); box-shadow: 0 7px 14px rgba(35, 101, 199, .2); }
@media (max-width: 520px) { .confirm-dialog { padding: 20px; border-radius: 17px; }.confirm-actions { display: grid; grid-template-columns: 1fr 1fr; }.confirm-actions button { width: 100%; } }
</style>
