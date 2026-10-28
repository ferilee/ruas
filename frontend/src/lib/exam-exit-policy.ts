export interface ExamExitContext {
  isDemo: boolean;
  assessmentTypeLabel?: string | null;
}

export interface ExamExitPolicy {
  /** True untuk ujian resmi: keluar di tengah sesi wajib kata sandi pengawas. */
  requiresSupervisorPassword: boolean;
  modeLabel: 'Ujian resmi' | 'Latihan / demo';
  /** Penjelasan yang ditampilkan SEBELUM ujian dimulai (layar persiapan & info). */
  prepLines: string[];
  /** Penjelasan di dialog keluar: apa yang terjadi pada progres & jawaban. */
  dialogDescription: string;
  /** Label tombol batal pada dialog keluar. */
  cancelLabel: string;
}

const PRACTICE_LABEL_PATTERN = /latihan|demo|try\s?out/i;

export function isPracticeAssessment(context: ExamExitContext): boolean {
  if (context.isDemo) return true;
  const label = context.assessmentTypeLabel?.trim() ?? '';
  return label !== '' && PRACTICE_LABEL_PATTERN.test(label);
}

export function getExamExitPolicy(context: ExamExitContext): ExamExitPolicy {
  if (isPracticeAssessment(context)) {
    return {
      requiresSupervisorPassword: false,
      modeLabel: 'Latihan / demo',
      prepLines: [
        'Ini sesi latihan/demo: kamu boleh keluar kapan saja tanpa kata sandi pengawas.',
        'Jawaban yang sudah tersimpan tetap tersimpan di server. Sesi latihan akan dihentikan saat kamu keluar dan hasilnya tidak masuk laporan resmi.',
      ],
      dialogDescription:
        'Sesi latihan ini akan dihentikan. Jawaban yang sudah tersimpan tetap tersimpan di server, dan kamu dapat memulai sesi latihan baru setelahnya.',
      cancelLabel: 'Kembali ke soal',
    };
  }

  return {
    requiresSupervisorPassword: true,
    modeLabel: 'Ujian resmi',
    prepLines: [
      'Keluar di tengah ujian hanya dapat dibuka dengan kata sandi pengawas. Kata sandi dipegang oleh guru/pengawas ujian, bukan oleh siswa.',
      'Jawaban yang sudah tersimpan tetap tersimpan di server. Saat pengawas membuka kunci keluar, sesi ini dihentikan dan ditandai berhenti.',
      'Jika perangkatmu bermasalah atau ada keadaan darurat, panggil pengawas terlebih dahulu — jangan menutup halaman begitu saja.',
    ],
    dialogDescription:
      'Sesi ujian ini akan dihentikan dan ditandai berhenti. Jawaban yang sudah tersimpan tetap tersimpan di server. Hanya pengawas yang dapat membuka kunci keluar dengan kata sandinya.',
    cancelLabel: 'Kembali ke soal',
  };
}
