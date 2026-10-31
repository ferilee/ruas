import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import ReportsPanel from '@/components/ReportsPanel.vue';
import ReportExportMenu from '@/components/ReportExportMenu.vue';
import { dispatchAdminRealtimeEvent } from '@/lib/admin-realtime';
import type { AdminReportData, AdminReportFilters, AdminReportPendingParticipant, AdminReportQuestionStatistic, AdminReportRow, AdminTopic, CurriculumData } from '@/types';

const {
  fetchAdminCurriculumMock,
  fetchAdminReportMock,
  fetchAdminReportDetailMock,
  fetchAdminReportResetCountMock,
  fetchAdminTopicsMock,
  fetchSchoolNameMock,
  resetAdminReportDataMock,
} = vi.hoisted(() => ({
  fetchAdminCurriculumMock: vi.fn(),
  fetchAdminReportMock: vi.fn(),
  fetchAdminReportDetailMock: vi.fn(),
  fetchAdminReportResetCountMock: vi.fn(),
  fetchAdminTopicsMock: vi.fn(),
  fetchSchoolNameMock: vi.fn(),
  resetAdminReportDataMock: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  fetchAdminCurriculum: fetchAdminCurriculumMock,
  fetchAdminReport: fetchAdminReportMock,
  fetchAdminReportDetail: fetchAdminReportDetailMock,
  fetchAdminReportResetCount: fetchAdminReportResetCountMock,
  fetchAdminTopics: fetchAdminTopicsMock,
  fetchSchoolName: fetchSchoolNameMock,
  resetAdminReportData: resetAdminReportDataMock,
}));

const curriculumFixture: CurriculumData = {
  classes: [
    { id: 3, slug: '11-tkj-a', label: '11 TKJ A', academic_year: '26/27', grade: 11, program: 'TKJ', section: 'A', display_order: 1, created_by: 'env-admin' },
    { id: 4, slug: '11-tkj-b', label: '11 TKJ B', academic_year: '26/27', grade: 11, program: 'TKJ', section: 'B', display_order: 2, created_by: 'env-admin' },
  ],
  assessment_types: [],
  subjects: [],
};

const topicsFixture: AdminTopic[] = [
  { id: 101, subject_id: 7, subject_label: 'Matematika', class_ids: [3], class_labels: ['11 TKJ A'], slug: 'sptldv', label: 'SPtLDV', display_order: 1, requires_token: false, token_configured: false, question_count: 12 },
  { id: 102, subject_id: 7, subject_label: 'Matematika', class_ids: [4], class_labels: ['11 TKJ B'], slug: 'matematika-keuangan', label: 'Matematika Keuangan', display_order: 2, requires_token: false, token_configured: false, question_count: 15 },
];

function reportRow(attemptId: number, topicId: number, classId: number, completedAt: string): AdminReportRow {
  return {
    attempt_id: attemptId,
    participant_id: attemptId,
    participant_code: `P-${attemptId}`,
    participant_name: `Siswa ${attemptId}`,
    username: `siswa.${attemptId}`,
    subject_id: 7,
    subject_label: 'Matematika',
    class_id: classId,
    class_label: classId === 3 ? '11 TKJ A' : '11 TKJ B',
    assessment_type_id: null,
    assessment_type_label: null,
    topic_id: topicId,
    topic_label: topicId === 101 ? 'SPtLDV' : 'Matematika Keuangan',
    status: 'completed',
    total_questions: 10,
    answered_questions: 10,
    correct_count: 8,
    incorrect_count: 2,
    total_time_seconds: 600,
    accuracy: 80,
    violation_count: 0,
    integrity_penalty: 0,
    final_score: 80,
    started_at: '2026-10-29T01:00:00Z',
    completed_at: completedAt,
  };
}

const allRows: AdminReportRow[] = [
  reportRow(1, 101, 3, '2026-10-27T03:00:00Z'),
  reportRow(2, 102, 4, '2026-10-28T03:00:00Z'),
  reportRow(3, 101, 3, '2026-10-29T03:00:00Z'),
];

function questionStats(topicId: number): AdminReportQuestionStatistic[] {
  const count = topicId === 101 ? 12 : 3;
  return Array.from({ length: count }, (_, index) => ({
    question_id: topicId * 100 + index + 1,
    question_text: `Soal nomor ${index + 1} untuk topik ${topicId}`,
    topic_label: topicId === 101 ? 'SPtLDV' : 'Matematika Keuangan',
    answered_count: 20,
    correct_count: 10,
    correct_percent: 50,
    average_time_seconds: 45,
    difficulty_label: 'Perlu diulang' as const,
  }));
}

// Komponen meneruskan objek filters reaktif yang sama ke setiap panggilan,
// jadi argumen harus disalin saat panggilan terjadi agar riwayat panggilan
// tidak ikut berubah oleh mutasi berikutnya.
const seenFilters: AdminReportFilters[] = [];

// Daftar "Belum selesai" hanya ada bila topik dipilih (meniru kontrak
// backend): untuk topik 101 ada dua nama, satu sedang mengerjakan.
const pendingFixture: AdminReportPendingParticipant[] = [
  { participant_id: 901, participant_name: 'Siswa Proses', username: 'siswa.proses', class_id: 3, class_label: '11 TKJ A', state: 'in_progress' },
  { participant_id: 902, participant_name: 'Siswa Telat', username: 'siswa.telat', class_id: 3, class_label: '11 TKJ A', state: 'not_started' },
];

function reportData(filters: AdminReportFilters): AdminReportData {
  const rows = allRows.filter((row) => (filters.topic_id === undefined || row.topic_id === filters.topic_id) && (filters.class_id === undefined || row.class_id === filters.class_id));
  return {
    filters,
    summary: { total_attempts: rows.length, completed_attempts: rows.length, in_progress_attempts: 0, abandoned_attempts: 0, average_score: 80, average_accuracy: 80, average_time_seconds: 600, total_violations: 0 },
    class_statistics: [],
    question_statistics: rows.length ? questionStats(rows[0].topic_id ?? 101) : [],
    pending_participants: filters.topic_id === 101
      ? pendingFixture.filter((participant) => filters.class_id === undefined || participant.class_id === filters.class_id)
      : [],
    rows,
  };
}

async function chooseSelectOption(wrapper: VueWrapper, ariaLabel: string, optionLabel: string) {
  const select = wrapper.findAll('.ruas-select').find((entry) => entry.get('.ruas-select-trigger').attributes('aria-label') === ariaLabel);
  expect(select, `RuasSelect "${ariaLabel}" harus ada`).toBeTruthy();
  await select!.get('.ruas-select-trigger').trigger('click');
  const option = select!.findAll('.ruas-select-option').find((entry) => entry.text() === optionLabel);
  expect(option, `Opsi "${optionLabel}" pada "${ariaLabel}" harus ada`).toBeTruthy();
  await option!.trigger('click');
  await flushPromises();
}

function lastReportFilters(): AdminReportFilters {
  return seenFilters[seenFilters.length - 1];
}

describe('ReportsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    seenFilters.length = 0;
    window.print = vi.fn();
    fetchAdminCurriculumMock.mockReset();
    fetchAdminReportMock.mockReset();
    fetchAdminReportDetailMock.mockReset();
    fetchAdminReportResetCountMock.mockReset();
    fetchAdminTopicsMock.mockReset();
    fetchSchoolNameMock.mockReset();
    resetAdminReportDataMock.mockReset();
    fetchAdminCurriculumMock.mockResolvedValue(curriculumFixture);
    fetchAdminTopicsMock.mockResolvedValue(topicsFixture);
    fetchSchoolNameMock.mockResolvedValue('SMKN Pasirian');
    fetchAdminReportMock.mockImplementation(async (filters: AdminReportFilters) => {
      seenFilters.push({ ...filters });
      return reportData(filters);
    });
  });

  it('simple: hasil siswa tampil sebelum analisis, analisis terlipat sampai dibuka', async () => {
    const wrapper = mount(ReportsPanel, { props: { simple: true, canReset: false, username: 'guru.satu' } });
    await flushPromises();

    const sections = wrapper.findAll('section');
    const resultsIndex = sections.findIndex((section) => section.classes().includes('simple-report-results'));
    const analysisIndex = sections.findIndex((section) => section.classes().includes('simple-question-stats'));
    expect(resultsIndex).toBeGreaterThanOrEqual(0);
    expect(analysisIndex).toBeGreaterThan(resultsIndex);
    expect(wrapper.get('.simple-report-results').text()).toContain('2. Lihat hasil siswa');
    expect(wrapper.get('.simple-question-stats').text()).toContain('3. Analisis per soal');

    // Terlipat secara default: judul dan pemicu tampil, baris analisis tidak.
    expect(wrapper.findAll('.simple-question-stat-row')).toHaveLength(0);
    const toggle = wrapper.get('.simple-analysis-toggle');
    expect(toggle.text()).toBe('Lihat analisis');
    expect(toggle.attributes('aria-expanded')).toBe('false');

    await toggle.trigger('click');
    // Di layar hanya 10 teratas yang dirender, seperti sebelumnya.
    expect(wrapper.findAll('.simple-question-stat-row')).toHaveLength(10);
    expect(toggle.text()).toBe('Tutup analisis');
    expect(toggle.attributes('aria-expanded')).toBe('true');
  });

  it('simple: tanpa ingatan, lingkup bawaan adalah topik hasil terbaru dan menjadi ingatan', async () => {
    const wrapper = mount(ReportsPanel, { props: { simple: true, canReset: false, username: 'guru.satu' } });
    await flushPromises();

    // Muat pertama tanpa lingkup, lalu dilingkupkan ke topik 101 (hasil
    // selesai paling akhir pada fixture) dan dimuat ulang.
    expect(seenFilters[0].topic_id).toBeUndefined();
    expect(lastReportFilters().topic_id).toBe(101);
    expect(localStorage.getItem('ruas_teacher_report_context:guru.satu')).toBe('{"topic_id":101}');
    expect(wrapper.get('.simple-report-results').text()).toContain('Siswa 3');
  });

  it('simple: ingatan konteks dipulihkan dan diterapkan pada muatan pertama', async () => {
    localStorage.setItem('ruas_teacher_report_context:guru.satu', '{"topic_id":102,"class_id":4}');
    mount(ReportsPanel, { props: { simple: true, canReset: false, username: 'guru.satu' } });
    await flushPromises();

    expect(fetchAdminReportMock).toHaveBeenCalledTimes(1);
    expect(lastReportFilters()).toMatchObject({ topic_id: 102, class_id: 4 });
  });

  it('simple: bidang ingatan yang basi dibuang satu per satu, yang sah tetap dipakai', async () => {
    localStorage.setItem('ruas_teacher_report_context:guru.satu', '{"topic_id":999,"class_id":4}');
    mount(ReportsPanel, { props: { simple: true, canReset: false, username: 'guru.satu' } });
    await flushPromises();

    expect(fetchAdminReportMock).toHaveBeenCalledTimes(1);
    expect(lastReportFilters().topic_id).toBeUndefined();
    expect(lastReportFilters().class_id).toBe(4);
  });

  it('simple: mengganti pilihan menyimpan konteks baru dan membersihkan topik di luar kelas', async () => {
    const wrapper = mount(ReportsPanel, { props: { simple: true, canReset: false, username: 'guru.satu' } });
    await flushPromises();
    // Keadaan bawaan: topik 101 (kelas 3). Pindah ke kelas 4.
    await chooseSelectOption(wrapper, 'Pilih kelas laporan', '11 TKJ B · 26/27');

    expect(lastReportFilters().class_id).toBe(4);
    expect(lastReportFilters().topic_id).toBeUndefined();
    expect(localStorage.getItem('ruas_teacher_report_context:guru.satu')).toBe('{"class_id":4}');
  });

  it('simple: penyegaran realtime mempertahankan konteks yang terpasang', async () => {
    localStorage.setItem('ruas_teacher_report_context:guru.satu', '{"topic_id":102,"class_id":4}');
    mount(ReportsPanel, { props: { simple: true, canReset: false, username: 'guru.satu' } });
    await flushPromises();
    fetchAdminReportMock.mockClear();
    seenFilters.length = 0;

    dispatchAdminRealtimeEvent({ id: 'evt-1', type: 'data.changed', occurred_at: '2026-10-29T04:00:00Z', resource: 'attempts', method: 'POST', path: '/api/exam-attempts' });
    await flushPromises();

    expect(fetchAdminReportMock).toHaveBeenCalled();
    expect(lastReportFilters()).toMatchObject({ topic_id: 102, class_id: 4 });
  });

  it('simple: ekspor analisis tetap memuat seluruh soal walau analisis terlipat di layar', async () => {
    const wrapper = mount(ReportsPanel, { props: { simple: true, canReset: false, username: 'guru.satu' } });
    await flushPromises();
    expect(wrapper.findAll('.simple-question-stat-row')).toHaveLength(0);

    const menu = wrapper.findComponent(ReportExportMenu);
    expect(menu.exists()).toBe(true);
    (menu.vm as unknown as { $emit: (event: string, mode: string) => void }).$emit('select', 'questions');
    await flushPromises();

    const printRows = wrapper.findAll('.report-print-documents .question-print-table tbody tr');
    expect(printRows).toHaveLength(12);
    expect(wrapper.get('.report-print-documents').text()).toContain('Soal nomor 12 untuk topik 101');
    // Layar tetap terlipat — dokumen cetak memang hidup dari data, bukan dari DOM layar.
    expect(wrapper.findAll('.simple-question-stat-row')).toHaveLength(0);
  });

  it('simple: kelompok Belum selesai tampil sesudah hasil siswa dengan hitungan dan lencana Sedang mengerjakan', async () => {
    const wrapper = mount(ReportsPanel, { props: { simple: true, canReset: false, username: 'guru.satu' } });
    await flushPromises();

    // Keadaan bawaan melingkup ke topik 101, yang punya dua nama pending.
    const pending = wrapper.find('.simple-report-pending');
    expect(pending.exists()).toBe(true);
    expect(pending.text()).toContain('Belum selesai (2)');
    expect(pending.text()).toContain('Siswa Telat');
    expect(pending.text()).toContain('Siswa Proses');
    expect(pending.text()).toContain('11 TKJ A');
    const badges = pending.findAll('.status-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0].text()).toBe('Sedang mengerjakan');

    const sections = wrapper.findAll('section');
    const resultsIndex = sections.findIndex((section) => section.classes().includes('simple-report-results'));
    const pendingIndex = sections.findIndex((section) => section.classes().includes('simple-report-pending'));
    const analysisIndex = sections.findIndex((section) => section.classes().includes('simple-question-stats'));
    expect(pendingIndex).toBeGreaterThan(resultsIndex);
    expect(analysisIndex).toBeGreaterThan(pendingIndex);
  });

  it('simple: kelompok Belum selesai tidak tampil bila daftarnya kosong', async () => {
    localStorage.setItem('ruas_teacher_report_context:guru.satu', '{"topic_id":102,"class_id":4}');
    const wrapper = mount(ReportsPanel, { props: { simple: true, canReset: false, username: 'guru.satu' } });
    await flushPromises();

    expect(lastReportFilters().topic_id).toBe(102);
    expect(wrapper.find('.simple-report-pending').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Belum selesai');
  });

  it('simple: kelompok Belum selesai tidak tampil tanpa topik terpilih', async () => {
    localStorage.setItem('ruas_teacher_report_context:guru.satu', '{"class_id":4}');
    const wrapper = mount(ReportsPanel, { props: { simple: true, canReset: false, username: 'guru.satu' } });
    await flushPromises();

    expect(lastReportFilters().topic_id).toBeUndefined();
    expect(wrapper.find('.simple-report-pending').exists()).toBe(false);
  });

  it('simple: nama Belum selesai tidak bocor ke dokumen cetak mana pun', async () => {
    const wrapper = mount(ReportsPanel, { props: { simple: true, canReset: false, username: 'guru.satu' } });
    await flushPromises();
    expect(wrapper.find('.simple-report-pending').exists()).toBe(true);

    const menu = wrapper.findComponent(ReportExportMenu);
    (menu.vm as unknown as { $emit: (event: string, mode: string) => void }).$emit('select', 'students');
    await flushPromises();

    expect(wrapper.get('.report-print-documents').text()).not.toContain('Siswa Telat');
    expect(wrapper.get('.report-print-documents').text()).not.toContain('Siswa Proses');
  });

  it('admin: kelompok Belum selesai tidak dirender walau respons berisi daftarnya', async () => {
    fetchAdminReportMock.mockImplementation(async (filters: AdminReportFilters) => {
      seenFilters.push({ ...filters });
      return { ...reportData(filters), pending_participants: pendingFixture };
    });
    const wrapper = mount(ReportsPanel, { props: { simple: false, canReset: false, username: 'admin' } });
    await flushPromises();

    expect(wrapper.find('.simple-report-pending').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Belum selesai');
  });

  it('admin: urutan dan isi varian lengkap persis seperti sebelumnya, tanpa ingatan konteks', async () => {
    const wrapper = mount(ReportsPanel, { props: { simple: false, canReset: false, username: 'admin' } });
    await flushPromises();

    expect(wrapper.find('.simple-report-results').exists()).toBe(false);
    expect(wrapper.find('.simple-analysis-toggle').exists()).toBe(false);
    const headings = wrapper.findAll('.panel-heading h3').map((heading) => heading.text());
    expect(headings.indexOf('Analisis per soal (semua siswa)')).toBeGreaterThanOrEqual(0);
    expect(headings.indexOf('Analisis per soal (semua siswa)')).toBeLessThan(headings.indexOf('Hasil siswa'));
    // Tabel analisis admin dirender langsung dengan seluruh barisnya.
    expect(wrapper.findAll('.question-statistics-table tbody tr').length).toBeGreaterThan(10);
    expect(fetchAdminReportMock).toHaveBeenCalledTimes(1);
    expect(lastReportFilters().topic_id).toBeUndefined();
    expect(localStorage.getItem('ruas_teacher_report_context:admin')).toBeNull();
  });
});
