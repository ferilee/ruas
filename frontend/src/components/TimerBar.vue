<template>
  <div class="timer-bar" :class="timerClass" role="timer" :aria-label="timerLabel">
    <span class="timer-icon">&#9202;</span>
    <span class="timer-label">{{ timerLabel }}</span>
    <span class="timer-value">{{ formatted }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';

const props = defineProps<{
  running: boolean;
  deadlineAt?: string | null;
  serverOffsetMs?: number;
}>();

const emit = defineEmits<{
  (e: 'time', value: number): void;
  (e: 'expired'): void;
}>();

const elapsed = ref(0);
const remaining = ref<number | null>(null);
let intervalId: ReturnType<typeof setInterval> | null = null;
let expiredEmitted = false;

const formatted = computed(() => {
  const seconds = remaining.value ?? elapsed.value;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});
const timerLabel = computed(() => remaining.value === null ? 'Waktu berjalan' : 'Sisa waktu');
const timerClass = computed(() => ({
  'countdown-warning': remaining.value !== null && remaining.value <= 300 && remaining.value > 60,
  'countdown-critical': remaining.value !== null && remaining.value <= 60,
}));

function updateTimer(incrementElapsed = false) {
  if (props.deadlineAt) {
    const deadline = new Date(props.deadlineAt).getTime();
    const now = Date.now() + (props.serverOffsetMs ?? 0);
    remaining.value = Math.max(0, Math.ceil((deadline - now) / 1000));
    if (remaining.value === 0 && !expiredEmitted) {
      expiredEmitted = true;
      emit('expired');
    }
    if (props.running && incrementElapsed) {
      elapsed.value++;
      emit('time', elapsed.value);
    }
  } else if (props.running && incrementElapsed) {
    elapsed.value++;
    emit('time', elapsed.value);
  }
}

function startInterval() {
  if (intervalId) clearInterval(intervalId);
  updateTimer();
  if (props.running || props.deadlineAt) intervalId = setInterval(() => updateTimer(true), 1000);
}

defineExpose({ formatted, remaining });

watch(
  () => [props.running, props.deadlineAt, props.serverOffsetMs],
  ([running, deadlineAt], previous) => {
    if (running && previous && (!previous[0] || previous[1] !== deadlineAt)) elapsed.value = 0;
    if (!deadlineAt && !running) emit('time', elapsed.value);
    if (deadlineAt !== previous?.[1]) {
      expiredEmitted = false;
      remaining.value = null;
    }
    startInterval();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>

<style scoped>
.timer-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #1e40af;
  color: #fff;
  border-radius: 10px;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 16px;
  transition: color .2s ease, background .2s ease, box-shadow .2s ease;
}

.timer-label { font-size: .75rem; letter-spacing: .02em; }
.countdown-warning { background: #a86a00; }
.countdown-critical { background: #b4232f; box-shadow: 0 0 0 0 rgba(180, 35, 47, .6); animation: timer-pulse 1s ease-in-out infinite; }

@keyframes timer-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(180, 35, 47, .58); }
  50% { box-shadow: 0 0 0 9px rgba(180, 35, 47, 0); }
}

.timer-icon {
  font-size: 1.2rem;
}
</style>
