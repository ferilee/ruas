import { computed, getCurrentInstance, onBeforeUnmount, ref } from 'vue';
import {
  abandonExamAttempt,
  completeExamAttempt,
  createExamAttempt,
  fetchActiveExamAttempt,
  fetchExamReview,
  fetchNextAttemptQuestion,
  fetchQuestionCount,
  fetchTopic,
  saveExamAnswer,
  saveExamIntegrityEvent,
} from '@/api/client';
import type { CheckResult, ExamAttempt, ExamReviewItem, ExplanationMode, Question } from '@/types';

export type QuizState = 'loading' | 'ready' | 'answering' | 'reviewing' | 'resume' | 'error';

interface SessionResult {
  correct: boolean;
  elapsed: number;
}

interface UseQuizSessionOptions {
  getTopicId: () => number;
  getQuerySubjectId: () => number;
  getQueryTopicLabel: () => string;
}

export function useQuizSession(options: UseQuizSessionOptions) {
  const state = ref<QuizState>('loading');
  const question = ref<Question | null>(null);
  const result = ref<CheckResult | null>(null);
  const selectedKeys = ref<string[]>([]);
  const timerRunning = ref(false);
  const elapsedTime = ref(0);
  const finalTime = ref(0);
  const errorMessage = ref('');
  const subjectId = ref(0);
  const topicLabel = ref('');
  const questionCount = ref(0);
  const autoStart = ref(false);
  const answeredIds = ref<Set<number>>(new Set());
  const sessionResults = ref<SessionResult[]>([]);
  const showExitModal = ref(false);
  const attemptId = ref<number | null>(null);
  const persistedAttempt = ref<ExamAttempt | null>(null);
  const serverClockOffsetMs = ref(0);
  const examReview = ref<ExamReviewItem[]>([]);
  const explanationMode = ref<ExplanationMode | null>(null);
  const clockTick = ref(Date.now());
  let clockInterval: ReturnType<typeof setInterval> | null = null;

  const currentQuestionNumber = computed(() => {
    if (state.value === 'reviewing') return answeredIds.value.size;
    return answeredIds.value.size + 1;
  });

  const correctCount = computed(() => sessionResults.value.filter((entry) => entry.correct).length);
  const incorrectCount = computed(() => sessionResults.value.filter((entry) => !entry.correct).length);
  const totalTime = computed(() => {
    const total = sessionResults.value.reduce((sum, entry) => sum + entry.elapsed, 0);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });
  const accuracy = computed(() => {
    if (sessionResults.value.length === 0) return 0;
    return Math.round((correctCount.value / sessionResults.value.length) * 100);
  });
  const isLastQuestion = computed(() => answeredIds.value.size >= questionCount.value);
  const minimumDurationSeconds = computed(() => (persistedAttempt.value?.minimum_duration_minutes ?? 0) * 60);
  const minimumTimeRemaining = computed(() => {
    clockTick.value;
    if (!persistedAttempt.value || minimumDurationSeconds.value === 0) return 0;
    const startedAt = new Date(persistedAttempt.value.started_at).getTime();
    const now = Date.now() + serverClockOffsetMs.value;
    return Math.max(0, minimumDurationSeconds.value - Math.floor((now - startedAt) / 1000));
  });
  const canComplete = computed(() => isLastQuestion.value && minimumTimeRemaining.value === 0);

  function startClock() {
    if (!clockInterval) clockInterval = setInterval(() => { clockTick.value = Date.now(); }, 1000);
  }

  async function loadQuestion() {
    state.value = 'loading';
    result.value = null;
    selectedKeys.value = [];
    elapsedTime.value = 0;
    finalTime.value = 0;

    try {
      if (!attemptId.value) throw new Error('Sesi ujian belum tersimpan. Silakan muat ulang halaman.');
      const nextQuestion = await fetchNextAttemptQuestion(attemptId.value);

      if (!nextQuestion) {
        await finishSession();
        return;
      }

      question.value = nextQuestion;
      if (autoStart.value) {
        autoStart.value = false;
        timerRunning.value = true;
        state.value = 'answering';
      } else {
        state.value = 'ready';
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Gagal memuat soal.';
      state.value = 'error';
    }
  }

  function syncServerClock(serverNow?: string) {
    if (!serverNow) return;
    const timestamp = new Date(serverNow).getTime();
    if (!Number.isNaN(timestamp)) serverClockOffsetMs.value = timestamp - Date.now();
  }

  async function ensureAttempt() {
    if (attemptId.value) return;
    const created = await createExamAttempt({ subject_id: subjectId.value, topic_id: options.getTopicId(), total_questions: questionCount.value });
    attemptId.value = created.attempt.id;
    persistedAttempt.value = created.attempt;
    syncServerClock(created.server_now);
    startClock();
  }

  async function startQuiz() {
    try {
      await ensureAttempt();
      if (questionCount.value === 0 || !question.value) {
        autoStart.value = true;
        await loadQuestion();
        return;
      }

      timerRunning.value = true;
      state.value = 'answering';
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Sesi ujian gagal disimpan.';
      state.value = 'error';
    }
  }

  function nextQuestion() {
    autoStart.value = true;
    loadQuestion();
  }

  function onSelectKeys(keys: string[]) {
    selectedKeys.value = keys;
  }

  function onTime(seconds: number) {
    elapsedTime.value = seconds;
    if (!timerRunning.value) finalTime.value = seconds;
  }

  async function submitAnswer() {
    if (!question.value || selectedKeys.value.length === 0) return;

    finalTime.value = elapsedTime.value;
    timerRunning.value = false;

    try {
      if (!attemptId.value) throw new Error('Sesi ujian belum tersimpan. Silakan muat ulang halaman.');
      const checkResult = await saveExamAnswer(attemptId.value, {
        question_id: question.value.id,
        selected_keys: selectedKeys.value,
        elapsed_seconds: finalTime.value,
      });
      result.value = checkResult;
      answeredIds.value.add(question.value.id);
      sessionResults.value.push({ correct: checkResult.correct, elapsed: finalTime.value });
      state.value = 'reviewing';
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Gagal memeriksa jawaban.';
      state.value = 'error';
    }
  }

  async function loadTopicInfo() {
    const querySubjectId = options.getQuerySubjectId();
    const queryTopicLabel = options.getQueryTopicLabel();

    if (Number.isInteger(querySubjectId) && querySubjectId > 0) {
      subjectId.value = querySubjectId;
    }

    if (queryTopicLabel) {
      topicLabel.value = queryTopicLabel;
    }

    if (subjectId.value > 0 && topicLabel.value) {
      return;
    }

    try {
      const topic = await fetchTopic(options.getTopicId());
      if (topic) {
        subjectId.value = topic.subject_id;
        topicLabel.value = topic.label;
      }
    } catch {
      subjectId.value = 1;
    }
  }

  async function loadQuestionCount() {
    try {
      questionCount.value = await fetchQuestionCount(options.getTopicId());
    } catch {
      questionCount.value = 0;
    }
  }

  async function retryCurrentState() {
    await Promise.all([loadTopicInfo(), loadQuestionCount()]);
    await loadQuestion();
  }

  async function recordIntegrityEvent(type: string, occurredAt: string) {
    if (!attemptId.value) return;
    await saveExamIntegrityEvent(attemptId.value, type, occurredAt);
  }

  async function finishSession() {
    timerRunning.value = false;
      if (attemptId.value) {
      try {
        persistedAttempt.value = await completeExamAttempt(attemptId.value);
        try {
          const review = await fetchExamReview(attemptId.value);
          explanationMode.value = review.mode;
          examReview.value = review.items;
        } catch {
          examReview.value = [];
        }
      } catch (error) {
        if ((error as Error & { code?: string }).code === 'minimum_duration_not_reached') {
          state.value = 'reviewing';
          errorMessage.value = error instanceof Error ? error.message : 'Minimum waktu pengerjaan belum tercapai.';
          return;
        }
        errorMessage.value = error instanceof Error ? error.message : 'Hasil ujian gagal disimpan.';
        state.value = 'error';
        return;
      }
    }
    state.value = 'resume';
  }

  function resetSession() {
    answeredIds.value = new Set();
    sessionResults.value = [];
    autoStart.value = false;
    attemptId.value = null;
    persistedAttempt.value = null;
    serverClockOffsetMs.value = 0;
    examReview.value = [];
    explanationMode.value = null;
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      if (clockInterval) clearInterval(clockInterval);
    });
  }

  function cancelExit() {
    showExitModal.value = false;
  }

  async function confirmExitState() {
    showExitModal.value = false;
    if (attemptId.value) await abandonExamAttempt(attemptId.value);
    resetSession();
    state.value = 'ready';
    question.value = null;
    timerRunning.value = false;
    elapsedTime.value = 0;
  }

  function hasActiveSession() {
    if (state.value === 'resume' || state.value === 'ready') return false;
    return state.value === 'answering' || state.value === 'reviewing' || answeredIds.value.size > 0;
  }

  async function initializeSession() {
    await Promise.all([loadTopicInfo(), loadQuestionCount()]);
    try {
      const active = await fetchActiveExamAttempt(options.getTopicId());
      syncServerClock(active.server_now);
      if (active.attempt) {
        attemptId.value = active.attempt.id;
        persistedAttempt.value = active.attempt;
        startClock();
        answeredIds.value = new Set(active.answers.map((answer) => answer.question_id));
        sessionResults.value = active.answers.map((answer) => ({ correct: answer.is_correct, elapsed: answer.elapsed_seconds }));
        await loadQuestion();
      } else {
        question.value = null;
        state.value = 'ready';
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Sesi ujian gagal disimpan.';
      state.value = 'error';
      return;
    }
  }

  return {
    accuracy,
    attemptId,
    answeredIds,
    cancelExit,
    confirmExitState,
    correctCount,
    currentQuestionNumber,
    elapsedTime,
    examReview,
    errorMessage,
    explanationMode,
    finalTime,
    finishSession,
    hasActiveSession,
    incorrectCount,
    initializeSession,
    isLastQuestion,
    loadQuestion,
    loadQuestionCount,
    loadTopicInfo,
    nextQuestion,
    onSelectKeys,
    onTime,
    question,
    questionCount,
    resetSession,
    recordIntegrityEvent,
    result,
    retryCurrentState,
    selectedKeys,
    showExitModal,
    startQuiz,
    state,
    subjectId,
    submitAnswer,
    timerRunning,
    deadlineAt: computed(() => persistedAttempt.value?.deadline_at ?? null),
    serverClockOffsetMs,
    topicLabel,
    totalTime,
    canComplete,
    minimumDurationSeconds,
    minimumTimeRemaining,
  };
}
