import { describe, expect, it } from 'vitest';
import { summarizeReport } from '@/services/report-service';

type ReportRow = Parameters<typeof summarizeReport>[0][number];

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
    assessment_type_label: 'Asesmen RUAS',
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
    question_order: null,
    started_at: '2026-10-10T01:00:00.000Z',
    completed_at: '2026-10-10T01:10:00.000Z',
    ...overrides,
  };
}

describe('report score policies', () => {
  it('uses the best, latest, or average score per student and assessment', () => {
    const rows = [
      createRow({ attempt_id: 1, final_score: 60, accuracy: 60, started_at: '2026-10-10T01:00:00.000Z', completed_at: '2026-10-10T01:10:00.000Z' }),
      createRow({ attempt_id: 2, final_score: 90, accuracy: 90, started_at: '2026-10-11T01:00:00.000Z', completed_at: '2026-10-11T01:10:00.000Z' }),
    ];

    expect(summarizeReport(rows, 'best')).toMatchObject({ total_attempts: 2, average_score: 90, average_accuracy: 90 });
    expect(summarizeReport(rows, 'latest')).toMatchObject({ average_score: 90, average_accuracy: 90 });
    expect(summarizeReport(rows, 'average')).toMatchObject({ average_score: 75, average_accuracy: 75 });
  });
});
