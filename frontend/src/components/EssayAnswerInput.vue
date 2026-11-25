<template>
  <div class="essay-answer">
    <label class="essay-label" :for="textareaId">Jawaban uraian singkat</label>
    <textarea
      :id="textareaId"
      class="essay-textarea"
      :value="modelValue"
      :disabled="disabled"
      rows="7"
      placeholder="Tulis jawabanmu dengan kalimat yang jelas dan ringkas..."
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    ></textarea>
    <p class="essay-hint">Jawaban uraian dinilai langsung oleh guru, jadi hasilnya berstatus menunggu penilaian sampai guru selesai menilai.</p>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue';

defineProps<{
  modelValue: string;
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const textareaId = useId();
</script>

<style scoped>
.essay-answer { display: flex; flex-direction: column; gap: 8px; }
.essay-label { color: #273d52; font-size: .85rem; font-weight: 700; }
.essay-textarea {
  width: 100%;
  min-height: 150px;
  padding: 13px 14px;
  border: 1px solid #c9d8e6;
  border-radius: 10px;
  color: #1c2b3a;
  background: #fbfdff;
  font: inherit;
  font-size: .95rem;
  line-height: 1.65;
  resize: vertical;
  outline: none;
}
.essay-textarea:focus { border-color: #1477c4; box-shadow: 0 0 0 3px rgba(20, 119, 196, .13); background: #fff; }
.essay-textarea:disabled { color: #71869a; background: #eef3f8; cursor: not-allowed; }
.essay-hint { margin: 0; color: #71869a; font-size: .76rem; line-height: 1.5; }
</style>
