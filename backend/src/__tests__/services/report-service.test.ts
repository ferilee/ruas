import { describe, expect, it } from 'vitest';
import { summarizeReportByClass } from '@/services/report-service';

type ReportRow = Parameters<typeof summarizeReportByClass>[0][number];

function createRow(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    attempt_id: 1,
    participant_id: 1,
    participant_code: 'P001',
    participant_name: 'Siswa Satu',
    username: 'siswa1',
    subject_id: 1,
    subject_label: 'Matematika',
    class_id: 1,
    class_label: 'Kelas 10',
    assessment_type_id: 1,
    assessment_type_label: 'Asesmen Ruas',
    topic_id: 1,
    topic_label: 'Aljabar',
    status: 'completed',
    total_questions: 10,
    answered_questions: 10,
    correct_count: 8,
    incorrect_count: 2,
    total_time_seconds: 600,
    accuracy: 80,
    violation_count: 1,
    integrity_penalty: 2,
    final_score: 78,
    started_at: '2026-10-10T01:00:00.000Z',
    completed_at: '2026-10-10T01:10:00.000Z',
    ...overrides,
  };
}

describe('summarizeReportByClass', () => {
  it('groups participants and completed results by class', () => {
    const statistics = summarizeReportByClass([
      createRow(),
      createRow({ attempt_id: 2, participant_id: 2, participant_code: 'P002', participant_name: 'Siswa Dua', final_score: 88, accuracy: 90, total_time_seconds: 800, violation_count: 0 }),
      createRow({ attempt_id: 3, participant_id: 3, class_id: 2, class_label: 'Kelas 11', final_score: 70, accuracy: 75, total_time_seconds: 500, violation_count: 2 }),
      createRow({ attempt_id: 4, participant_id: 4, status: 'in_progress', final_score: 0, accuracy: 0, total_time_seconds: 40, completed_at: null }),
    ]);

    expect(statistics).toEqual([
      expect.objectContaining({
        class_id: 1,
        class_label: 'Kelas 10',
        participant_count: 3,
        total_attempts: 3,
        completed_attempts: 2,
        average_score: 83,
        average_accuracy: 85,
        average_time_seconds: 700,
        total_violations: 1,
      }),
      expect.objectContaining({
        class_id: 2,
        class_label: 'Kelas 11',
        participant_count: 1,
        total_attempts: 1,
        completed_attempts: 1,
        average_score: 70,
        average_accuracy: 75,
        average_time_seconds: 500,
        total_violations: 2,
      }),
    ]);
  });
});

describe('summarizeQuestionStatistics (RUAS-009)', () => {
  it('aggregates correct percentage per question across students, hardest first', async () => {
    const { summarizeQuestionStatistics } = await import('@/services/report-service');
    const stats = summarizeQuestionStatistics([
      { question_id: 1, question_text: 'Soal mudah', topic_label: 'Aljabar', is_correct: true, elapsed_seconds: 30 },
      { question_id: 1, question_text: 'Soal mudah', topic_label: 'Aljabar', is_correct: true, elapsed_seconds: 50 },
      { question_id: 2, question_text: 'Soal sulit', topic_label: 'Aljabar', is_correct: false, elapsed_seconds: 90 },
      { question_id: 2, question_text: 'Soal sulit', topic_label: 'Aljabar', is_correct: true, elapsed_seconds: 70 },
      { question_id: 2, question_text: 'Soal sulit', topic_label: 'Aljabar', is_correct: false, elapsed_seconds: 80 },
      { question_id: 2, question_text: 'Soal sulit', topic_label: 'Aljabar', is_correct: false, elapsed_seconds: 60 },
    ]);
    expect(stats.map((item) => item.question_id)).toEqual([2, 1]);
    expect(stats[0]).toMatchObject({ answered_count: 4, correct_count: 1, correct_percent: 25, difficulty_label: 'Perlu diulang', average_time_seconds: 75 });
    expect(stats[1]).toMatchObject({ answered_count: 2, correct_count: 2, correct_percent: 100, difficulty_label: 'Terkuasai' });
  });

  it('returns an empty list when nobody answered', async () => {
    const { summarizeQuestionStatistics } = await import('@/services/report-service');
    expect(summarizeQuestionStatistics([])).toEqual([]);
  });
});
