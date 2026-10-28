export interface TopicReadinessInput {
  questionCount: number;
  hasSchedule: boolean;
  tokenConfigured: boolean;
}

export type TopicReadinessStatus = 'no-questions' | 'unscheduled' | 'no-token' | 'ready';

export interface TopicReadiness {
  status: TopicReadinessStatus;
  /** Lencana status yang ditampilkan di daftar topik. */
  label: string;
  /** Aksi berikutnya yang disarankan untuk guru. */
  nextStep: string;
  isReady: boolean;
}

/**
 * Kelengkapan satu topik (RUAS-003): soal -> jadwal -> token.
 * Urutan ini mengikuti alur menyiapkan asesmen dari nol sampai siap dibuka.
 */
export function getTopicReadiness(input: TopicReadinessInput): TopicReadiness {
  if (input.questionCount <= 0) {
    return {
      status: 'no-questions',
      label: 'Belum ada soal',
      nextStep: 'Tambah soal ke topik ini',
      isReady: false,
    };
  }
  if (!input.hasSchedule) {
    return {
      status: 'unscheduled',
      label: 'Belum dijadwalkan',
      nextStep: 'Atur jadwal topik ini',
      isReady: false,
    };
  }
  if (!input.tokenConfigured) {
    return {
      status: 'no-token',
      label: 'Token belum diatur',
      nextStep: 'Atur token topik ini',
      isReady: false,
    };
  }
  return { status: 'ready', label: 'Siap dibuka', nextStep: 'Tinjau jadwal', isReady: true };
}
