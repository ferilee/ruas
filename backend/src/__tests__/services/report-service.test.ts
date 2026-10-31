import { describe, expect, it } from 'vitest';
import { computePendingParticipants, summarizeReportByClass, type PendingParticipantsData, type ReportFilters } from '@/services/report-service';

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

type PendingUser = PendingParticipantsData['users'][number];

function pendingUser(overrides: Partial<PendingUser> = {}): PendingUser {
  return {
    id: 1,
    username: 'siswa1',
    display_name: 'Siswa Satu',
    class_id: 1,
    role: 'participant',
    active: 1,
    is_demo: 0,
    created_by: null,
    ...overrides,
  };
}

function pendingData(overrides: Partial<PendingParticipantsData> = {}): PendingParticipantsData {
  return {
    topic: { subject_id: 7, created_by: 'env-admin' },
    subject_created_by: 'env-admin',
    subject_class_created_by: 'env-admin',
    schedule_access_mode: null,
    schedule_participant_user_ids: [],
    topic_class_ids: [1],
    classes: [
      { id: 1, label: 'Kelas 10', created_by: 'env-admin' },
      { id: 2, label: 'Kelas 11', created_by: 'env-admin' },
    ],
    users: [],
    attempts: [],
    ...overrides,
  };
}

const pendingFilters: ReportFilters = { status: 'completed', topic_id: 10 };

describe('computePendingParticipants (Belum selesai)', () => {
  it('class mode: roster from topic classes, completed excluded, in_progress marked, sorted by class then name', () => {
    const result = computePendingParticipants(pendingData({
      schedule_access_mode: 'class',
      topic_class_ids: [1, 2],
      users: [
        pendingUser({ id: 3, username: 'siswa3', display_name: 'Siswa Tiga', class_id: 2 }),
        pendingUser({ id: 1, username: 'siswa1', display_name: 'Siswa Satu', class_id: 1 }),
        pendingUser({ id: 2, username: 'siswa2', display_name: 'Siswa Dua', class_id: 1 }),
        pendingUser({ id: 4, username: 'siswa4', display_name: 'Siswa Empat', class_id: 1 }),
        pendingUser({ id: 5, username: 'siswa5', display_name: 'Siswa Lima', class_id: 3 }),
      ],
      attempts: [
        { username: 'siswa2', status: 'completed' },
        { username: 'siswa4', status: 'in_progress' },
      ],
    }), pendingFilters);

    // Urutan: per label kelas, lalu nama (Empat sebelum Satu secara alfabetis).
    expect(result).toEqual([
      expect.objectContaining({ participant_id: 4, participant_name: 'Siswa Empat', class_label: 'Kelas 10', state: 'in_progress' }),
      expect.objectContaining({ participant_id: 1, participant_name: 'Siswa Satu', class_label: 'Kelas 10', state: 'not_started' }),
      expect.objectContaining({ participant_id: 3, participant_name: 'Siswa Tiga', class_label: 'Kelas 11', state: 'not_started' }),
    ]);
  });

  it('no schedule falls back to the topic class roster, same as class mode', () => {
    const result = computePendingParticipants(pendingData({
      schedule_access_mode: null,
      users: [pendingUser()],
    }), pendingFilters);
    expect(result).toEqual([expect.objectContaining({ participant_id: 1, state: 'not_started' })]);
  });

  it('individual mode: only the explicitly listed participants are expected', () => {
    const result = computePendingParticipants(pendingData({
      schedule_access_mode: 'individual',
      schedule_participant_user_ids: [2],
      topic_class_ids: [1],
      users: [
        pendingUser({ id: 1, username: 'siswa1', class_id: 1 }),
        pendingUser({ id: 2, username: 'siswa2', display_name: 'Siswa Dua', class_id: 2 }),
        pendingUser({ id: 3, username: 'siswa3', display_name: 'Siswa Tiga', class_id: null }),
      ],
    }), pendingFilters);
    expect(result).toEqual([
      expect.objectContaining({ participant_id: 2, class_id: 2, class_label: 'Kelas 11', state: 'not_started' }),
    ]);
  });

  it('intersects with the report class filter', () => {
    const result = computePendingParticipants(pendingData({
      topic_class_ids: [1, 2],
      users: [
        pendingUser({ id: 1, class_id: 1 }),
        pendingUser({ id: 2, username: 'siswa2', display_name: 'Siswa Dua', class_id: 2 }),
      ],
    }), { ...pendingFilters, class_id: 2 });
    expect(result.map((item) => item.participant_id)).toEqual([2]);
  });

  it('a completed attempt wins over an in_progress attempt for the same student', () => {
    const result = computePendingParticipants(pendingData({
      users: [pendingUser()],
      attempts: [
        { username: 'siswa1', status: 'in_progress' },
        { username: 'siswa1', status: 'completed' },
      ],
    }), pendingFilters);
    expect(result).toEqual([]);
  });

  it('editor scope limits names outside the teacher reach, but own-created students stay visible', () => {
    const result = computePendingParticipants(pendingData({
      topic_class_ids: [1, 2],
      users: [
        pendingUser({ id: 1, username: 'siswa1', class_id: 1 }),
        pendingUser({ id: 2, username: 'siswa2', display_name: 'Siswa Dua', class_id: 2 }),
        pendingUser({ id: 3, username: 'siswa3', display_name: 'Siswa Tiga', class_id: 2, created_by: 'guru.satu' }),
      ],
    }), { ...pendingFilters, scope_owner_username: 'guru.satu', scope_subject_id: 7, scope_class_ids: [1] });
    expect(result.map((item) => item.participant_id)).toEqual([1, 3]);
  });

  it('topic without class links and without an individual schedule yields an empty list', () => {
    const result = computePendingParticipants(pendingData({
      topic_class_ids: [],
      users: [pendingUser()],
    }), pendingFilters);
    expect(result).toEqual([]);
  });

  it('is not computed without a topic filter or a known topic', () => {
    expect(computePendingParticipants(pendingData({ users: [pendingUser()] }), { status: 'completed' })).toEqual([]);
    expect(computePendingParticipants(pendingData({ topic: null, users: [pendingUser()] }), pendingFilters)).toEqual([]);
  });

  it('excludes inactive, demo, and non-participant accounts from the roster', () => {
    const result = computePendingParticipants(pendingData({
      users: [
        pendingUser({ id: 1 }),
        pendingUser({ id: 2, username: 'siswa2', active: 0 }),
        pendingUser({ id: 3, username: 'siswa3', is_demo: 1 }),
        pendingUser({ id: 4, username: 'guru1', role: 'editor' }),
      ],
    }), pendingFilters);
    expect(result.map((item) => item.participant_id)).toEqual([1]);
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
