<template>
  <div v-if="visibleMedia.length" class="question-media-gallery">
    <figure v-for="item in visibleMedia" :key="item.id" class="question-media-item">
      <img :src="item.url ?? undefined" :alt="item.alt_text" loading="lazy" />
      <figcaption v-if="item.caption">{{ item.caption }}</figcaption>
    </figure>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { QuestionMedia } from '@/types';

const props = defineProps<{ media?: QuestionMedia[] }>();
const visibleMedia = computed(() => (props.media ?? []).filter((item) => item.url));
</script>

<style scoped>
.question-media-gallery { display: flex; flex-direction: column; gap: 14px; margin: 18px 0 4px; }
.question-media-item { margin: 0; text-align: center; }
.question-media-item img { display: block; max-width: 100%; max-height: 460px; margin: 0 auto; border: 1px solid #d8e3ef; border-radius: 10px; object-fit: contain; background: #fff; }
.question-media-item figcaption { margin-top: 7px; color: #71849b; font-size: .82rem; line-height: 1.45; }
</style>
