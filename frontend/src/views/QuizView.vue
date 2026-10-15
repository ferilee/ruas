<template>
  <div ref="examPageRef" class="exam-page" :class="fontSizeClass">
    <header class="exam-topbar">
      <router-link to="/" class="exam-brand" @click.prevent="tryExit">
        <span class="brand-mark">RA</span>
        <span class="brand-copy">
          <strong>RUANG ASESMEN</strong>
          <small>UJIAN SEKOLAH</small>
        </span>
      </router-link>

      <div class="participant-label">
        <span>Peserta</span>
        <strong>Mode ujian</strong>
      </div>

      <span v-if="examGuard.active" class="security-badge" aria-label="Perlindungan ujian aktif">🔒 Perlindungan aktif</span>

      <div class="exam-actions">
        <button class="topbar-button" type="button" @click="showInfoModal = true">Informasi Ujian</button>
        <button class="topbar-button question-list-button" type="button" @click="showQuestionList = true">
          Daftar Soal <span class="grid-icon">▦</span>
        </button>
      </div>
    </header>

    <TimerBar
      v-if="state === 'answering' || state === 'reviewing'"
      class="timer-driver"
      :running="timerRunning"
      :deadline-at="deadlineAt"
      :server-offset-ms="serverClockOffsetMs"
      @time="onTime"
      @expired="handleTimeExpired"
    />

    <main class="exam-main">
      <div class="exam-heading">
        <div>
          <button class="exam-back" type="button" @click="tryExit">&larr; Keluar dari ujian</button>
          <h1>Soal nomor {{ currentQuestionNumber }}</h1>
          <p v-if="topicLabel">{{ topicLabel }} <span v-if="questionCount">· {{ questionCount }} soal</span></p>
        </div>

        <div class="font-controls" aria-label="Ukuran font soal">
          <span>Ukuran font soal:</span>
          <button type="button" :class="{ active: fontSize === 'small' }" @click="setFontSize('small')">A</button>
          <button type="button" :class="{ active: fontSize === 'normal' }" @click="setFontSize('normal')">A</button>
          <button type="button" :class="{ active: fontSize === 'large' }" @click="setFontSize('large')">A</button>
        </div>
      </div>

      <div v-if="state === 'loading'" class="exam-state-card"><p>Memuat soal...</p></div>

      <div v-else-if="state === 'ready'" class="exam-state-card ready-card">
        <span class="state-kicker">PERSIAPAN UJIAN</span>
        <h2>Siap mengerjakan?</h2>
        <p>{{ questionCount }} soal tersedia. Countdown dimulai setelah kamu menekan tombol mulai.</p>
        <button class="primary-exam-button" type="button" :disabled="startingCountdown || !questionCountReady || questionCount === 0" @click="beginExam">{{ startingCountdown ? 'Bersiap...' : 'Mulai Ujian' }}</button>
      </div>

      <div v-else-if="state === 'resume'" class="exam-state-card resume-card">
        <span class="state-kicker">UJIAN SELESAI</span>
        <h2>Hasil pengerjaan</h2>
        <p v-if="endedByTimeout" class="timeout-notice" role="status">Waktu habis. Jawaban yang tersimpan telah dikumpulkan otomatis.</p>
        <div class="resume-stats">
          <div><strong>{{ correctCount }}</strong><span>Benar</span></div>
          <div><strong>{{ incorrectCount }}</strong><span>Salah</span></div>
          <div><strong>{{ accuracy }}%</strong><span>Akurasi</span></div>
          <div><strong>{{ totalTime }}</strong><span>Total waktu</span></div>
        </div>
        <section class="integrity-result" :class="{ flagged: violationCount > 0 }" aria-labelledby="integrity-title">
          <div class="integrity-heading">
            <strong id="integrity-title">Integritas sesi</strong>
            <span>{{ violationCount > 0 ? 'Perlu ditinjau' : 'Tidak ada peringatan' }}</span>
          </div>
          <p v-if="violationCount === 0">Tidak ada perpindahan tab, keluar fullscreen, atau shortcut terlarang yang tercatat.</p>
          <template v-else>
            <p>{{ violationCount }} aktivitas perlindungan tercatat selama pengerjaan.</p>
            <ul>
              <li v-for="item in violationSummary" :key="item.type">{{ item.label }} ({{ item.count }}×)</li>
            </ul>
            <small>Aktivitas ini dapat ditinjau pengawas sesuai kebijakan ujian.</small>
          </template>
        </section>
        <section v-if="explanationMode" class="exam-review-result" aria-labelledby="review-title">
          <div class="review-heading">
            <div>
              <span class="state-kicker">PEMBAHASAN</span>
              <h3 id="review-title">Review jawaban</h3>
            </div>
            <span v-if="examReview.length" class="review-count">{{ examReview.length }} soal</span>
          </div>
          <p v-if="explanationMode === 'hidden'" class="review-note">Pembahasan disembunyikan oleh admin untuk asesmen ini.</p>
          <p v-else-if="explanationMode === 'after_answer'" class="review-note">Pembahasan telah ditampilkan setelah setiap jawaban.</p>
          <template v-else-if="examReview.length">
            <article v-for="item in examReview" :key="item.question_id" class="review-item">
              <div class="review-item-heading"><strong>Soal #{{ item.question_id }}</strong><span :class="item.is_correct ? 'review-correct' : 'review-incorrect'">{{ item.is_correct ? 'Benar' : 'Salah' }}</span></div>
              <MathText :text="item.question_text" />
              <div class="review-explanation"><strong>Pembahasan</strong><MathText :text="item.explanation" /></div>
            </article>
          </template>
        </section>
        <router-link :to="`/topics/${subjectId}`" class="primary-exam-button">Pilih Ujian Lain</router-link>
      </div>

      <div v-else-if="state === 'error'" class="exam-state-card error-card">
        <h2>Soal belum dapat dimuat</h2>
        <p>{{ errorMessage }}</p>
        <button class="primary-exam-button" type="button" @click="retryCurrentState">Coba Lagi</button>
      </div>

      <template v-else-if="question">
        <div class="exam-workspace">
          <section class="exam-pane question-pane">
            <div class="pane-heading">
              <div>
                <span class="pane-kicker">SOAL {{ currentQuestionNumber }}</span>
                <h2>Perhatikan soal berikut.</h2>
              </div>
              <span class="question-type-label">{{ questionTypeLabel }}</span>
            </div>
            <div class="pane-scroll question-scroll"><MathText :text="question.question_text" /></div>
          </section>

          <section class="exam-pane answer-pane">
            <div class="pane-heading">
              <div>
                <span class="pane-kicker">JAWABAN</span>
                <h2>{{ question.type === 'multiple_response' ? 'Pilih semua jawaban yang benar.' : 'Pilih satu jawaban.' }}</h2>
              </div>
              <span v-if="isDoubtful" class="doubt-badge">Ragu-ragu</span>
            </div>

            <div class="pane-scroll answer-scroll">
              <OptionList
                :options="question.options"
                :type="question.type"
                :selected-keys="selectedKeys"
                :disabled="state !== 'answering'"
                :correct-keys="result?.correct_keys"
                :show-result="state === 'reviewing'"
                @update:selected-keys="onSelectKeys"
              />

              <ExplanationPanel
                v-if="state === 'reviewing' && result && result.explanation"
                :correct="result.correct"
                :correct_keys="result.correct_keys"
                :explanation="result.explanation || ''"
                :elapsed_seconds="finalTime"
                :is_last="isLastQuestion"
                :show-actions="false"
              />
              <div v-else-if="state === 'reviewing' && result" class="explanation-unavailable">
                {{ result.correct_answer_hidden ? 'Jawaban benar disembunyikan oleh admin untuk jawaban yang salah.' : result.explanation_mode === 'after_exam' ? 'Pembahasan akan ditampilkan setelah asesmen selesai.' : 'Pembahasan disembunyikan oleh admin.' }}
              </div>
            </div>
          </section>
        </div>

        <nav class="exam-navigation" aria-label="Navigasi ujian">
          <p v-if="state === 'reviewing' && errorMessage" class="minimum-time-note" role="status">{{ errorMessage }}</p>
          <button class="nav-button nav-secondary" type="button" @click="tryExit"><span>‹</span> Keluar dari ujian</button>
          <button class="nav-button nav-doubt" :class="{ active: isDoubtful }" type="button" :disabled="flagSaving" @click="toggleDoubtful">
            <span>□</span> {{ isDoubtful ? 'Ragu-ragu ditandai' : 'Tandai ragu-ragu' }}
          </button>
          <button v-if="state === 'answering'" class="nav-button nav-primary" type="button" :disabled="selectedKeys.length === 0 || submittingAnswer" @click="submitAnswer">
            {{ submittingAnswer ? 'Menyimpan...' : 'Simpan jawaban' }} <span>›</span>
          </button>
          <button v-else class="nav-button nav-primary" type="button" :disabled="isLastQuestion && !canComplete" @click="goToNextStep">
            {{ isLastQuestion ? canComplete ? 'Lihat hasil' : `Tunggu ${formatDuration(minimumTimeRemaining)}` : 'Soal berikutnya' }} <span>›</span>
          </button>
        </nav>
      </template>
    </main>

    <div v-if="showInfoModal" class="exam-modal-backdrop" @click.self="showInfoModal = false">
      <section class="exam-modal" role="dialog" aria-modal="true" aria-labelledby="info-title">
        <button class="modal-close" type="button" aria-label="Tutup" @click="showInfoModal = false">×</button>
        <span class="state-kicker">INFORMASI UJIAN</span>
        <h2 id="info-title">{{ topicLabel || 'Ujian sekolah' }}</h2>
        <p>Kerjakan soal dengan teliti. Kamu dapat menandai soal yang masih diragukan untuk membantumu memantau pengerjaan.</p>
        <ul>
          <li>Soal bertanda ragu-ragu tetap dapat dijawab dan dikoreksi.</li>
          <li>Timer menampilkan sisa waktu. Jika tidak ada batas waktu, timer menampilkan waktu berjalan.</li>
          <li v-if="minimumDurationSeconds > 0">Minimum waktu {{ Math.ceil(minimumDurationSeconds / 60) }} menit berlaku untuk seluruh sesi. Kamu tetap dapat berpindah soal, tetapi hasil baru dapat dilihat setelah semua soal selesai dan waktu minimum tercapai.</li>
          <li>Jawaban diperiksa setelah tombol simpan jawaban ditekan.</li>
          <li>Perpindahan tab, keluar layar penuh, dan shortcut terlarang akan menjeda ujian.</li>
        </ul>
        <p v-if="violationCount" class="security-count">Aktivitas tercatat: <strong>{{ violationCount }}</strong></p>
        <button class="primary-exam-button" type="button" @click="showInfoModal = false">Mengerti</button>
      </section>
    </div>

    <div v-if="showQuestionList" class="exam-modal-backdrop" @click.self="showQuestionList = false">
      <section class="exam-modal question-list-modal" role="dialog" aria-modal="true" aria-labelledby="list-title">
        <button class="modal-close" type="button" aria-label="Tutup" @click="showQuestionList = false">×</button>
        <span class="state-kicker">NAVIGASI</span>
        <h2 id="list-title">Daftar soal</h2>
        <p class="modal-description">Status soal pada sesi ini.</p>
        <div class="question-number-grid">
          <button v-for="number in questionNumbers" :key="number" type="button" class="question-number" :class="questionNumberClass(number)" :aria-current="number === currentQuestionNumber ? 'step' : undefined" @click="goToQuestion(number)">
            {{ number }}
          </button>
        </div>
        <div class="question-status-legend">
          <span><i class="legend-dot current"></i> Sedang dikerjakan</span>
          <span><i class="legend-dot answered"></i> Sudah dijawab</span>
          <span><i class="legend-dot"></i> Belum dikerjakan</span>
          <span><i class="legend-dot doubtful"></i> Ragu-ragu</span>
        </div>
      </section>
    </div>

    <div v-if="showExitModal" class="exam-modal-backdrop" @click.self="cancelExit">
      <section class="exam-modal exit-modal" role="dialog" aria-modal="true" aria-labelledby="exit-title">
        <span class="state-kicker">KONFIRMASI</span>
        <h2 id="exit-title">Keluar dari ujian?</h2>
        <p>Progress sesi ini akan dihentikan.</p>
        <label class="exit-password-field">
          <span>Kata sandi pengawas</span>
          <input v-model="exitPassword" type="password" autocomplete="off" placeholder="Masukkan kata sandi" :disabled="exitLoading" />
        </label>
        <p v-if="exitError" class="exit-error" role="alert">{{ exitError }}</p>
        <div class="modal-actions">
          <button class="nav-button nav-secondary" type="button" @click="cancelExit">Lanjutkan</button>
          <button class="nav-button nav-primary" type="button" :disabled="exitLoading || !exitPassword" @click="confirmExit">
            {{ exitLoading ? 'Memeriksa...' : 'Keluar' }}
          </button>
        </div>
      </section>
    </div>

    <div v-if="showSecurityWarning" class="exam-modal-backdrop security-backdrop">
      <section class="exam-modal security-modal" role="alertdialog" aria-modal="true" aria-labelledby="security-title">
        <span class="state-kicker">PERLINDUNGAN UJIAN</span>
        <h2 id="security-title">Ujian dijeda sementara</h2>
        <p>{{ securityMessage }}</p>
        <p class="security-count">Aktivitas tercatat: <strong>{{ violationCount }}</strong></p>
        <button class="primary-exam-button" type="button" @click="resumeExam">Kembali ke Ujian</button>
      </section>
    </div>

    <div v-if="startingCountdown" class="start-countdown-backdrop" role="status" aria-live="assertive">
      <div class="start-countdown-card">
        <span class="state-kicker">UJIAN DIMULAI</span>
        <strong :key="countdownValue" class="start-countdown-number">{{ countdownValue }}</strong>
        <p>Siapkan diri. Soal pertama segera dibuka.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import MathText from '@/components/MathText.vue';
import OptionList from '@/components/OptionList.vue';
import ExplanationPanel from '@/components/ExplanationPanel.vue';
import TimerBar from '@/components/TimerBar.vue';
import { verifyExamExitPassword } from '@/api/client';
import { useQuizSession } from '@/composables/useQuizSession';
import { useExamGuard, type ExamViolation, type ExamViolationType } from '@/composables/useExamGuard';

const route = useRoute();
const router = useRouter();
const fontSize = ref<'small' | 'normal' | 'large'>('normal');
const showInfoModal = ref(false);
const showQuestionList = ref(false);
const showSecurityWarning = ref(false);
const securityMessage = ref('Aktivitas di luar halaman ujian terdeteksi.');
const exitPassword = ref('');
const exitError = ref('');
const exitLoading = ref(false);
const examPageRef = ref<HTMLElement | null>(null);
const startingCountdown = ref(false);
const countdownValue = ref(0);

function getTopicId(): number { return Number(route.params.id); }

const {
  accuracy, cancelExit: dismissExitModal, confirmExitState, correctCount, endedByTimeout,
  currentQuestionNumber, currentQuestionDoubtful: isDoubtful, errorMessage, examReview, explanationMode, finalTime, finishSession, hasActiveSession,
  incorrectCount, initializeSession, isLastQuestion, nextQuestion, onSelectKeys, question,
  questionCount, questionCountReady, recordIntegrityEvent, resetSession, result, retryCurrentState, selectedKeys, showExitModal,
  startQuiz, state, subjectId, submitAnswer, topicLabel, totalTime, timerRunning, onTime,
  deadlineAt, serverClockOffsetMs, canComplete, minimumDurationSeconds, minimumTimeRemaining, submittingAnswer,
  toggleDoubtful, flagSaving, isQuestionAnswered, isQuestionDoubtful, loadQuestionNumber,
} = useQuizSession({
  getTopicId,
  getQuerySubjectId: () => Number(route.query.subject_id),
  getQueryTopicLabel: () => typeof route.query.topic_label === 'string' ? route.query.topic_label : '',
});

const examGuard = useExamGuard({ onViolation: handleViolation });
const violationCount = examGuard.violationCount;
const violationLabels: Record<ExamViolationType, string> = {
  fullscreen_exit: 'Keluar dari fullscreen',
  tab_hidden: 'Perpindahan tab atau aplikasi',
  window_blur: 'Fokus jendela berpindah',
  blocked_shortcut: 'Shortcut terlarang',
};
const violationSummary = computed(() => {
  const counts = new Map<ExamViolationType, number>();
  for (const violation of examGuard.violations.value) {
    counts.set(violation.type, (counts.get(violation.type) ?? 0) + 1);
  }
  return Array.from(counts, ([type, count]) => ({ type, count, label: violationLabels[type] }));
});

const fontSizeClass = computed(() => `font-${fontSize.value}`);
const questionNumbers = computed(() => Array.from({ length: questionCount.value }, (_, index) => index + 1));
const questionTypeLabel = computed(() => {
  if (question.value?.type === 'multiple_response') return 'Pilihan ganda kompleks';
  if (question.value?.type === 'true_false') return 'Benar atau salah';
  return 'Pilihan ganda';
});

function setFontSize(size: 'small' | 'normal' | 'large') { fontSize.value = size; }

function questionNumberClass(number: number) {
  return {
    current: number === currentQuestionNumber.value,
    answered: isQuestionAnswered(number) && number !== currentQuestionNumber.value,
    doubtful: isQuestionDoubtful(number),
  };
}

function goToQuestion(number: number) {
  showQuestionList.value = false;
  if (number === currentQuestionNumber.value) return;
  void loadQuestionNumber(number);
}

function goToNextStep() {
  if (isLastQuestion.value && !canComplete.value) return;
  if (isLastQuestion.value) {
    examGuard.deactivate();
    void examGuard.exitFullscreen();
    finishSession();
  }
  else { nextQuestion(); }
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${String(remainder).padStart(2, '0')}d`;
}

async function beginExam() {
  if (startingCountdown.value) return;
  if (!examGuard.isSupported.value) {
    securityMessage.value = 'Browser ini tidak mendukung mode layar penuh. Gunakan browser terbaru untuk memulai ujian.';
    showSecurityWarning.value = true;
    return;
  }

  examGuard.activate();
  const entered = await examGuard.enterFullscreen(examPageRef.value);
  if (!entered) {
    examGuard.deactivate();
    securityMessage.value = 'Mode layar penuh wajib diaktifkan sebelum ujian dimulai.';
    showSecurityWarning.value = true;
    return;
  }

  startingCountdown.value = true;
  try {
    for (let value = 3; value >= 1; value -= 1) {
      countdownValue.value = value;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    countdownValue.value = 0;
    await startQuiz();
  } finally {
    startingCountdown.value = false;
  }
}

async function resumeExam() {
  examGuard.activate();
  const entered = await examGuard.enterFullscreen(examPageRef.value);
  if (!entered) {
    securityMessage.value = 'Mode layar penuh belum aktif. Izinkan layar penuh untuk melanjutkan.';
    return;
  }

  showSecurityWarning.value = false;
  if (state.value === 'ready') await startQuiz();
  else if (state.value === 'answering') timerRunning.value = true;
}

function handleTimeExpired() {
  if (state.value !== 'answering' && state.value !== 'reviewing') return;
  timerRunning.value = false;
  void finishSession('timeout');
}

function handleViolation(violation: ExamViolation) {
  const messages: Record<ExamViolation['type'], string> = {
    fullscreen_exit: 'Mode layar penuh ditutup.',
    tab_hidden: 'Perpindahan tab atau aplikasi terdeteksi.',
    window_blur: 'Fokus jendela ujian berpindah.',
    blocked_shortcut: 'Shortcut yang tidak diizinkan terdeteksi.',
  };
  securityMessage.value = `${messages[violation.type]} Ujian dijeda sampai kamu kembali.`;
  void recordIntegrityEvent(violation.type, violation.occurred_at).catch(() => {
    securityMessage.value += ' Aktivitas belum berhasil disimpan ke server.';
  });
  showSecurityWarning.value = true;
  if (state.value === 'answering') timerRunning.value = false;
}

function tryExit() {
  if (hasActiveSession()) showExitModal.value = true;
  else {
    examGuard.deactivate();
    void examGuard.exitFullscreen();
    router.push(`/topics/${subjectId.value}`);
  }
}

function cancelExit() {
  dismissExitModal();
  exitPassword.value = '';
  exitError.value = '';
}

async function confirmExit() {
  if (!exitPassword.value || exitLoading.value) return;
  exitLoading.value = true;
  exitError.value = '';

  try {
    await verifyExamExitPassword(exitPassword.value);
  } catch (error) {
    exitError.value = error instanceof Error ? error.message : 'Kata sandi pengawas salah.';
    return;
  } finally {
    exitLoading.value = false;
  }

  examGuard.deactivate();
  await examGuard.exitFullscreen();
  try {
    await confirmExitState();
  } catch (error) {
    exitError.value = error instanceof Error ? error.message : 'Sesi ujian gagal disimpan.';
    return;
  }
  exitPassword.value = '';
  router.push(`/topics/${subjectId.value}`);
}

watch(() => route.params.id, (newId) => {
  if (!newId) return;
  resetSession();
  initializeSession();
});

onBeforeRouteLeave((_to, _from, next) => {
  if (hasActiveSession()) { showExitModal.value = true; next(false); }
  else next();
});

onMounted(() => { initializeSession(); });
</script>

<style scoped>
.timer-driver { display: flex; margin: 0; border-radius: 0; padding: 8px 16px; font-size: 1rem; }
.minimum-time-note { flex: 1 1 100%; margin: 0; color: #a86d1b; font-size: .78rem; font-weight: 700; text-align: center; }
.start-countdown-backdrop { position: fixed; z-index: 40; inset: 0; display: grid; place-items: center; background: rgba(8, 34, 82, .72); backdrop-filter: blur(7px); }
.start-countdown-card { display: flex; width: min(360px, calc(100% - 40px)); flex-direction: column; align-items: center; padding: 30px 24px; border: 1px solid rgba(255,255,255,.55); border-radius: 24px; color: #fff; background: linear-gradient(145deg, rgba(31, 121, 215, .96), rgba(25, 65, 170, .96)); box-shadow: 0 25px 70px rgba(0, 20, 70, .38); text-align: center; }
.start-countdown-card .state-kicker { color: #cbe5ff; }.start-countdown-number { margin: 8px 0; color: #fff; font-size: clamp(6rem, 24vw, 10rem); line-height: .95; text-shadow: 0 8px 24px rgba(0,0,0,.18); animation: countdown-pop .95s ease both; }.start-countdown-card p { color: rgba(255,255,255,.84); font-size: .86rem; }
@keyframes countdown-pop { 0% { opacity: .2; transform: scale(.58); } 60% { opacity: 1; transform: scale(1.08); } 100% { transform: scale(1); } }
.exam-page { width: 100%; height: 100dvh; min-height: 100vh; min-height: 100svh; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; background: #f4f7fb; color: #1c2b3a; font-size: 16px; }
.exam-page.font-small { font-size: 14px; }
.exam-page.font-large { font-size: 18px; }
.exam-topbar { position: sticky; z-index: 12; top: 0; min-height: 76px; padding: 12px 32px; display: flex; align-items: center; gap: 28px; color: #fff; background: linear-gradient(115deg, #0d6fb8 0%, #176ca7 54%, #12588d 100%); box-shadow: 0 2px 8px rgba(16, 66, 104, .22); }
.exam-brand { display: flex; align-items: center; gap: 12px; color: #fff; text-decoration: none; }
.brand-mark { width: 44px; height: 44px; display: grid; place-items: center; border: 2px solid rgba(255,255,255,.7); border-radius: 50%; font-size: .85rem; font-weight: 800; letter-spacing: .04em; }
.brand-copy { display: flex; flex-direction: column; line-height: 1.2; }
.brand-copy strong { font-size: 1rem; letter-spacing: .06em; }
.brand-copy small { margin-top: 4px; font-size: .72rem; letter-spacing: .14em; opacity: .8; }
.participant-label { margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; font-size: .75rem; opacity: .86; }
.participant-label strong { font-size: .88rem; color: #fff; }
.security-badge { padding: 7px 12px; border: 1px solid rgba(255,255,255,.5); border-radius: 18px; color: #fff; background: rgba(0, 35, 68, .18); font-size: .72rem; font-weight: 700; white-space: nowrap; }
.exam-actions { display: flex; align-items: center; gap: 10px; }
.topbar-button { min-height: 40px; padding: 8px 16px; border: 1px solid rgba(255,255,255,.68); border-radius: 22px; color: #fff; background: rgba(255,255,255,.08); font: inherit; font-size: .82rem; font-weight: 700; cursor: pointer; }
.topbar-button:hover { background: rgba(255,255,255,.18); }
.question-list-button { background: #fff; color: #1266a5; border-color: #fff; }
.grid-icon { margin-left: 5px; font-size: 1.05rem; }
.exam-main { width: min(1280px, 100%); margin: 0 auto; padding: 24px 32px 32px; }
.exam-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 18px; }
.exam-back { padding: 0; border: 0; color: #587087; background: transparent; font: inherit; font-size: .86rem; cursor: pointer; }
.exam-back:hover { color: #1266a5; }
.exam-heading h1 { margin-top: 5px; color: #1a2d40; font-size: 1.7rem; }
.exam-heading p { margin-top: 3px; color: #667d91; font-size: .95rem; }
.font-controls { display: flex; align-items: center; gap: 8px; color: #71869a; font-size: .82rem; }
.font-controls button { min-width: 28px; border: 0; color: #49647b; background: transparent; cursor: pointer; }
.font-controls button:nth-of-type(1) { font-size: .8rem; }
.font-controls button:nth-of-type(2) { font-size: 1rem; }
.font-controls button:nth-of-type(3) { font-size: 1.2rem; }
.font-controls button.active { color: #1266a5; font-weight: 800; }
.exam-workspace { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(360px, .95fr); gap: 16px; min-height: min(60vh, 570px); }
.exam-pane { min-width: 0; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #dce5ee; border-radius: 10px; background: #fff; box-shadow: 0 4px 16px rgba(43, 74, 103, .06); }
.pane-heading { min-height: 76px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; gap: 16px; border-bottom: 1px solid #e6edf3; }
.pane-kicker, .state-kicker { color: #1571b5; font-size: .72rem; font-weight: 800; letter-spacing: .1em; }
.pane-heading h2 { margin-top: 4px; color: #273d52; font-size: 1rem; }
.question-type-label { color: #7890a4; font-size: .78rem; text-align: right; }
.pane-scroll { flex: 1; min-height: 0; overflow: auto; }
.question-scroll { padding: 28px 30px; color: #24384b; font-size: 1.08em; line-height: 1.8; }
.answer-scroll { padding: 22px 20px; }
.answer-scroll :deep(.explanation-panel) { margin-top: 22px; }
.doubt-badge { padding: 4px 9px; border-radius: 12px; color: #986700; background: #fff4c7; font-size: .72rem; font-weight: 700; }
.exam-navigation { margin-top: 18px; padding: 12px 0 0; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.nav-button, .primary-exam-button { min-height: 44px; padding: 10px 22px; border: 0; border-radius: 24px; font: inherit; font-weight: 700; cursor: pointer; text-decoration: none; text-align: center; }
.nav-button:disabled { opacity: .5; cursor: default; }
.nav-button span { font-size: 1.3em; line-height: 0; vertical-align: -1px; }
.nav-secondary { color: #587087; background: #e8eef4; }
.nav-secondary:hover { background: #dce6ee; }
.nav-doubt { color: #856000; background: #fff0b8; }
.nav-doubt.active { color: #fff; background: #d29400; }
.nav-primary, .primary-exam-button { color: #fff; background: #1378cc; }
.nav-primary:hover, .primary-exam-button:hover { background: #0f68ae; }
.exam-state-card { min-height: 360px; padding: 48px 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; border: 1px solid #dce5ee; border-radius: 10px; background: #fff; text-align: center; box-shadow: 0 4px 16px rgba(43, 74, 103, .06); }
.exam-state-card h2 { color: #233b51; font-size: 1.45rem; }
.exam-state-card p { max-width: 520px; color: #6b8194; }
.ready-card .primary-exam-button, .resume-card .primary-exam-button, .error-card .primary-exam-button { margin-top: 8px; }
.timeout-notice { width: min(560px, 100%); margin: 0 0 12px; padding: 11px 14px; border: 1px solid #f0c7a6; border-radius: 10px; color: #9b5d2a; background: #fff8f1; font-size: .82rem; line-height: 1.45; }
.resume-stats { width: min(560px, 100%); margin: 18px 0 10px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.resume-stats div { padding: 14px 8px; border-radius: 8px; background: #f1f6fa; }
.resume-stats strong, .resume-stats span { display: block; }
.resume-stats strong { color: #136cae; font-size: 1.35rem; }
.resume-stats span { color: #71869a; font-size: .75rem; }
.integrity-result { width: min(560px, 100%); margin: 4px 0 10px; padding: 14px 16px; border: 1px solid #cfe3d8; border-radius: 10px; color: #397157; background: #f1fbf5; text-align: left; }
.integrity-result.flagged { border-color: #f0c7a6; color: #9b5d2a; background: #fff8f1; }
.integrity-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.integrity-heading span { font-size: .75rem; font-weight: 700; }
.integrity-result p { margin-top: 5px; max-width: none; font-size: .78rem; line-height: 1.5; }
.integrity-result ul { margin: 8px 0 4px 18px; font-size: .78rem; line-height: 1.6; }
.integrity-result small { display: block; margin-top: 7px; font-size: .72rem; }
.exam-review-result { width: min(760px, 100%); margin: 10px 0 16px; padding: 18px; border: 1px solid #d5e3f1; border-radius: 14px; color: #345577; background: #f8fbff; text-align: left; }
.review-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.review-heading h3 { margin-top: 3px; color: #173e7f; font-size: 1.05rem; }
.review-count { color: #6d88aa; font-size: .75rem; font-weight: 700; }
.review-note { color: #66809e; font-size: .8rem; }
.review-item { margin-top: 11px; padding: 14px; border: 1px solid #dce8f5; border-radius: 11px; background: #fff; font-size: .82rem; line-height: 1.55; }
.review-item-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; color: #294e7d; }
.review-correct, .review-incorrect { font-size: .7rem; font-weight: 800; }
.review-correct { color: #25815f; }.review-incorrect { color: #c1604e; }
.review-explanation { margin-top: 11px; padding: 10px 12px; border-radius: 9px; color: #4b6785; background: #f1f7ff; }
.review-explanation strong { display: block; margin-bottom: 4px; color: #245da5; font-size: .75rem; }
.explanation-unavailable { margin-top: 14px; padding: 12px; border: 1px dashed #bdd2e8; border-radius: 10px; color: #66809e; background: #f7fbff; font-size: .8rem; }
.error-card h2 { color: #b33d45; }
.exam-modal-backdrop { position: fixed; inset: 0; z-index: 20; padding: max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left)); display: grid; place-items: center; background: rgba(24, 45, 65, .42); }
.exam-modal { position: relative; width: min(520px, 100%); max-height: calc(100dvh - 40px); overflow-y: auto; padding: 30px; border-radius: 14px; background: #fff; box-shadow: 0 18px 50px rgba(24, 45, 65, .22); }
.exam-modal h2 { margin: 5px 0 12px; color: #233b51; }
.exam-modal p, .exam-modal li { color: #63798c; line-height: 1.7; }
.exam-modal ul { margin: 14px 0 22px; padding-left: 20px; }
.modal-close { position: absolute; top: 12px; right: 16px; border: 0; color: #71869a; background: transparent; font-size: 1.6rem; cursor: pointer; }
.question-list-modal { width: min(600px, 100%); }
.modal-description { margin-bottom: 18px; }
.question-number-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; }
.question-number { min-height: 38px; display: grid; place-items: center; border: 1px solid #d4e0ea; border-radius: 7px; color: #60778a; background: #f8fafc; font: inherit; font-weight: 700; cursor: pointer; }
.question-number:hover { border-color: #1477c4; color: #1477c4; }
.question-number.current { color: #fff; border-color: #1477c4; background: #1477c4; }
.question-number.answered { color: #fff; border-color: #48a47a; background: #48a47a; }
.question-number.doubtful { border-color: #d29400; box-shadow: inset 0 -4px 0 #d29400; }
.question-number.current.doubtful { color: #fff; border-color: #1477c4; box-shadow: inset 0 -4px 0 #ffd45a; }
.question-number.answered.doubtful { border-color: #48a47a; box-shadow: inset 0 -4px 0 #ffd45a; }
.question-status-legend { margin-top: 20px; display: flex; flex-wrap: wrap; gap: 12px; color: #71869a; font-size: .78rem; }
.question-status-legend span { display: inline-flex; align-items: center; gap: 5px; }
.legend-dot { width: 10px; height: 10px; display: inline-block; border: 1px solid #d4e0ea; border-radius: 50%; background: #f8fafc; }
.legend-dot.current { border-color: #1477c4; background: #1477c4; }
.legend-dot.answered { border-color: #48a47a; background: #48a47a; }
.legend-dot.doubtful { border-color: #d29400; background: #ffd45a; }
.exit-modal { width: min(420px, 100%); text-align: center; }
.exit-modal .modal-actions { margin-top: 22px; display: flex; justify-content: center; gap: 10px; }
.exit-password-field { display: flex; flex-direction: column; gap: 7px; margin-top: 18px; color: #63798c; font-size: .82rem; font-weight: 700; text-align: left; }
.exit-password-field input { width: 100%; min-height: 44px; padding: 10px 13px; border: 1px solid #d4e0ea; border-radius: 10px; color: #263d54; background: #f8fafc; font: inherit; outline: none; }
.exit-password-field input:focus { border-color: #1477c4; box-shadow: 0 0 0 3px rgba(20, 119, 196, .12); }
.exit-error { margin-top: 10px; color: #b33d45; font-size: .82rem; }
.security-modal { width: min(460px, 100%); text-align: center; }
.security-modal .primary-exam-button { margin-top: 18px; }
.security-count { margin-top: 10px; color: #b33d45 !important; font-size: .82rem; }
.security-backdrop { background: rgba(24, 45, 65, .58); }
.exam-page { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
@media print { .exam-page { display: none !important; } }
@media (max-width: 860px) {
  .exam-topbar { padding: 12px 20px; gap: 14px; }
  .participant-label { display: none; }
  .security-badge { margin-left: auto; }
  .exam-main { padding: 20px; }
  .exam-workspace { grid-template-columns: 1fr; min-height: auto; }
  .exam-pane { min-height: 0; overflow: visible; }
  .pane-scroll { flex: none; max-height: none; overflow: visible; }
}
@media (max-width: 600px) {
  .exam-topbar { min-height: 68px; padding: 10px 14px; flex-wrap: wrap; gap: 10px; }
  .brand-mark { width: 36px; height: 36px; font-size: .7rem; }
  .brand-copy strong { font-size: .8rem; }
  .brand-copy small { font-size: .6rem; }
  .exam-actions { width: 100%; margin-left: 0; justify-content: space-between; }
  .topbar-button { min-height: 38px; padding: 8px 10px; font-size: .72rem; }
  .question-list-button { font-size: 0; }
  .question-list-button .grid-icon { margin: 0; font-size: 1.2rem; }
  .exam-main { padding: 16px 12px calc(32px + env(safe-area-inset-bottom)); }
  .exam-heading { align-items: flex-start; flex-direction: column; gap: 12px; }
  .exam-heading h1 { font-size: 1.4rem; }
  .font-controls { align-self: flex-end; }
  .pane-heading { padding: 14px 16px; }
  .question-scroll { padding: 22px 18px; }
  .answer-scroll { padding: 16px 12px; }
  .exam-navigation { position: sticky; z-index: 10; bottom: max(8px, env(safe-area-inset-bottom)); flex-wrap: wrap; margin-right: -4px; margin-left: -4px; padding: 8px; border: 1px solid #d6e3ef; border-radius: 14px; background: rgba(255, 255, 255, .94); box-shadow: 0 10px 24px rgba(33, 73, 108, .16); backdrop-filter: blur(12px); }
  .nav-button { flex: 1 1 calc(50% - 7px); padding: 10px 12px; font-size: .82rem; }
  .nav-primary { order: 3; flex-basis: 100%; }
  .resume-stats { grid-template-columns: repeat(2, 1fr); }
  .question-number-grid { grid-template-columns: repeat(5, 1fr); }
}
</style>
