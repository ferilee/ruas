<template>
  <div class="statement-list">
    <div
      v-for="statement in options"
      :key="statement.key"
      class="statement-item"
      :class="{
        'statement-judged': isJudged(statement.key),
        'statement-correct': showResult && resultFor(statement.key)?.correct === true,
        'statement-wrong': showResult && resultFor(statement.key)?.correct === false,
        'statement-disabled': disabled,
      }"
    >
      <div class="statement-text"><MathText :text="statement.text" /></div>
      <div class="statement-actions" role="group" :aria-label="`Penilaian untuk pernyataan ${statement.key}`">
        <button
          type="button"
          class="judge-button judge-true"
          :class="{ selected: judgements[statement.key] === true }"
          :disabled="disabled"
          :aria-pressed="judgements[statement.key] === true"
          @click="emit('judge', statement.key, true)"
        >
          Benar
        </button>
        <button
          type="button"
          class="judge-button judge-false"
          :class="{ selected: judgements[statement.key] === false }"
          :disabled="disabled"
          :aria-pressed="judgements[statement.key] === false"
          @click="emit('judge', statement.key, false)"
        >
          Salah
        </button>
      </div>
      <p v-if="showResult && resultFor(statement.key)" class="statement-feedback">
        <span v-if="resultFor(statement.key)?.correct === true" class="feedback-correct">&#10003; Tepat</span>
        <span v-else-if="resultFor(statement.key)?.correct === false" class="feedback-wrong">&#10007; Kurang tepat</span>
        <span v-if="correctKeys" class="feedback-key">Kunci: {{ correctKeys.includes(statement.key) ? 'Benar' : 'Salah' }}</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import MathText from '@/components/MathText.vue';
import type { QuestionOption, StatementResult } from '@/types';

const props = defineProps<{
  options: QuestionOption[];
  judgements: Record<string, boolean>;
  disabled: boolean;
  statementResults?: StatementResult[];
  correctKeys?: string[];
  showResult?: boolean;
}>();

const emit = defineEmits<{
  (e: 'judge', key: string, judgedTrue: boolean): void;
}>();

function isJudged(key: string): boolean {
  return key in props.judgements;
}

function resultFor(key: string): StatementResult | undefined {
  return props.statementResults?.find((result) => result.key === key);
}
</script>

<style scoped>
.statement-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.statement-item {
  padding: 14px 16px;
  background: #fff;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
}

.statement-judged {
  border-color: #b9cdf3;
}

.statement-correct {
  border-color: #2f855a;
  background: #f2fbf5;
}

.statement-wrong {
  border-color: #c53030;
  background: #fff5f5;
}

.statement-text {
  font-size: 1rem;
  line-height: 1.6;
  color: #24384b;
}

.statement-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.judge-button {
  flex: 1;
  min-height: 48px;
  padding: 10px 16px;
  border: 2px solid #aab4c0;
  border-radius: 10px;
  background: #fff;
  color: #44566b;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.judge-button:hover:not(:disabled) {
  border-color: #1e40af;
}

.judge-button.selected {
  border-color: #1e40af;
  background: #1e40af;
  color: #fff;
}

.judge-button:disabled {
  cursor: default;
  opacity: 0.75;
}

.statement-feedback {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 10px;
  font-size: 0.85rem;
  font-weight: 700;
}

.feedback-correct {
  color: #2f855a;
}

.feedback-wrong {
  color: #c53030;
}

.feedback-key {
  color: #556677;
  font-weight: 600;
}

@media (min-width: 861px) {
  .statement-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 240px;
    column-gap: 18px;
    align-items: center;
  }

  .statement-actions {
    margin-top: 0;
  }

  .statement-feedback {
    grid-column: 1 / -1;
  }
}
</style>
