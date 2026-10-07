<template>
  <span class="math-text" v-html="renderedText"></span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const props = defineProps<{
  text: string;
}>();

const mathPattern = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\r?\n/g, '<br>');
}

function hasMathDelimiters(value: string): boolean {
  return /\\\[|\\\(|\$\$|\$[^$\n]+\$/.test(value);
}

function normalizeLegacyMath(value: string): string {
  return value
    .replace(/\b(?:akar|sqrt)\s*\(([^()\n]+)\)/gi, '\\(\\sqrt{$1}\\)')
    .replace(/\b([A-Za-z])\s*\^\s*([A-Za-z0-9]+)\b/g, '\\($1^{$2}\\)');
}

function renderMath(value: string): string {
  const source = hasMathDelimiters(value) ? value : normalizeLegacyMath(value);
  let result = '';
  let cursor = 0;

  for (const match of source.matchAll(mathPattern)) {
    const fullMatch = match[0];
    const index = match.index ?? 0;
    const expression = match[1] ?? match[2] ?? match[3] ?? match[4] ?? '';
    const displayMode = fullMatch.startsWith('\\[') || fullMatch.startsWith('$$');

    result += escapeHtml(source.slice(cursor, index));
    result += katex.renderToString(expression.trim(), {
      displayMode,
      throwOnError: false,
      trust: false,
      output: 'htmlAndMathml',
    });
    cursor = index + fullMatch.length;
  }

  return result + escapeHtml(source.slice(cursor));
}

const renderedText = computed(() => renderMath(props.text));
</script>

<style scoped>
.math-text {
  line-height: inherit;
}

.math-text :deep(.katex-display) {
  margin: 0.65em 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.15em 0;
}

.math-text :deep(.katex) {
  font-size: 1.05em;
}
</style>
