import { computed, onUnmounted, ref } from 'vue';

export type ExamViolationType = 'fullscreen_exit' | 'tab_hidden' | 'window_blur' | 'blocked_shortcut';

export interface ExamViolation {
  type: ExamViolationType;
  occurred_at: string;
}

interface ExamGuardOptions {
  onViolation: (violation: ExamViolation) => void;
}

const blockedShortcutKeys = new Set(['c', 'v', 'x', 'p', 's', 'u', 'r', 'f12']);

export function useExamGuard(options: ExamGuardOptions) {
  const active = ref(false);
  const violations = ref<ExamViolation[]>([]);
  let lastViolationAt = 0;

  const violationCount = computed(() => violations.value.length);
  const isSupported = computed(() => typeof document !== 'undefined' && typeof document.documentElement.requestFullscreen === 'function');

  function recordViolation(type: ExamViolationType) {
    if (!active.value) return;

    const now = Date.now();
    if (now - lastViolationAt < 1200) return;
    lastViolationAt = now;

    const violation = { type, occurred_at: new Date(now).toISOString() } satisfies ExamViolation;
    violations.value.push(violation);
    options.onViolation(violation);
  }

  function preventDefault(event: Event) {
    if (!active.value) return;
    event.preventDefault();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!active.value) return;

    const key = event.key.toLowerCase();
    const modifier = event.ctrlKey || event.metaKey;
    const developerShortcut = event.key === 'F12' || (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key));
    if (developerShortcut || (modifier && blockedShortcutKeys.has(key))) {
      event.preventDefault();
      event.stopPropagation();
      recordViolation('blocked_shortcut');
    }
  }

  function handleVisibilityChange() {
    if (active.value && document.visibilityState === 'hidden') recordViolation('tab_hidden');
  }

  function handleWindowBlur() {
    recordViolation('window_blur');
  }

  function handleFullscreenChange() {
    if (active.value && !document.fullscreenElement) recordViolation('fullscreen_exit');
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!active.value) return;
    event.preventDefault();
    event.returnValue = '';
  }

  function activate() {
    if (active.value) return;
    violations.value = [];
    lastViolationAt = 0;
    active.value = true;
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('cut', preventDefault);
    document.addEventListener('paste', preventDefault);
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('dragstart', preventDefault);
    document.addEventListener('selectstart', preventDefault);
    document.addEventListener('keydown', handleKeydown, true);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  function deactivate() {
    if (!active.value) return;
    active.value = false;
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('copy', preventDefault);
    document.removeEventListener('cut', preventDefault);
    document.removeEventListener('paste', preventDefault);
    document.removeEventListener('contextmenu', preventDefault);
    document.removeEventListener('dragstart', preventDefault);
    document.removeEventListener('selectstart', preventDefault);
    document.removeEventListener('keydown', handleKeydown, true);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  }

  async function enterFullscreen(element: HTMLElement | null) {
    if (!element?.requestFullscreen) return false;
    try {
      await element.requestFullscreen();
      return Boolean(document.fullscreenElement);
    } catch {
      return false;
    }
  }

  async function exitFullscreen() {
    if (!document.fullscreenElement || !document.exitFullscreen) return;
    try {
      await document.exitFullscreen();
    } catch {
      // The browser may already have exited fullscreen.
    }
  }

  onUnmounted(() => {
    deactivate();
  });

  return {
    activate,
    active,
    deactivate,
    enterFullscreen,
    exitFullscreen,
    isSupported,
    violationCount,
    violations,
  };
}
