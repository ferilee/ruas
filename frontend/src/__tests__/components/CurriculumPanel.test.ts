import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import CurriculumPanel from '@/components/CurriculumPanel.vue';
import type { AdminSession, AdminTopic, CurriculumData } from '@/types';

const {
  fetchAdminCurriculumMock,
  fetchAdminTopicsMock,
  fetchAdminScheduleMock,
} = vi.hoisted(() => ({
  fetchAdminCurriculumMock: vi.fn(),
  fetchAdminTopicsMock: vi.fn(),
  fetchAdminScheduleMock: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  createAdminAssessmentType: vi.fn(),
  createAdminClass: vi.fn(),
  createAdminSubject: vi.fn(),
  createAdminTopic: vi.fn(),
  deleteAdminTopic: vi.fn(),
  fetchAdminSchedule: fetchAdminScheduleMock,
  fetchAdminTopics: fetchAdminTopicsMock,
  deleteAdminAssessmentType: vi.fn(),
  deleteAdminClass: vi.fn(),
  deleteAdminSubject: vi.fn(),
  fetchAdminCurriculum: fetchAdminCurriculumMock,
  importAdminCurriculum: vi.fn(),
  updateAdminAssessmentType: vi.fn(),
  updateAdminClass: vi.fn(),
  updateAdminSubject: vi.fn(),
  updateAdminTopic: vi.fn(),
}));

const teacherSession: AdminSession = { username: 'guru.satu', display_name: 'Guru Satu', role: 'editor', subject_id: 7, class_id: 3, class_ids: [3] };
const adminSessionFixture: AdminSession = { username: 'admin', display_name: 'Admin', role: 'admin', subject_id: null, class_id: null, class_ids: [] };

const curriculumFixture: CurriculumData = {
  classes: [
    { id: 3, slug: '11-tkj-a', label: 'Kelas 11 TKJ A', academic_year: '2026/2027', grade: 11, program: 'TKJ', section: 'A', display_order: 1, created_by: 'env-admin' },
    { id: 5, slug: '11-tkj-b', label: 'Kelas 11 TKJ B', academic_year: '2026/2027', grade: 11, program: 'TKJ', section: 'B', display_order: 2, created_by: 'env-admin' },
  ],
  assessment_types: [
    { id: 1, slug: 'kuis', label: 'Kuis', display_order: 1, created_by: 'env-admin' },
    { id: 2, slug: 'ulangan-harian', label: 'Ulangan Harian', display_order: 2, created_by: 'env-admin' },
  ],
  subjects: [
    { id: 7, slug: 'matematika', label: 'Matematika', display_order: 1, max_attempts: 1, duration_minutes: 60, minimum_duration_minutes: 0, explanation_mode: 'hidden', show_correct_answer_on_wrong: false, class_id: null, assessment_type_id: 1, created_by: 'env-admin' },
    { id: 8, slug: 'informatika', label: 'Informatika', display_order: 2, max_attempts: 3, duration_minutes: 80, minimum_duration_minutes: 0, explanation_mode: 'after_exam', show_correct_answer_on_wrong: true, class_id: null, assessment_type_id: 2, created_by: 'guru.satu' },
  ],
};

const topicsFixture: AdminTopic[] = [
  { id: 101, subject_id: 7, subject_label: 'Matematika', class_ids: [], class_labels: [], slug: 'aljabar-dasar', label: 'Aljabar Dasar', display_order: 1, requires_token: true, token_configured: true, question_count: 10, created_by: 'guru.satu' },
  { id: 102, subject_id: 7, subject_label: 'Matematika', class_ids: [3], class_labels: ['Kelas 11 TKJ A'], slug: 'geometri-ruang', label: 'Geometri Ruang', display_order: 2, requires_token: false, token_configured: false, question_count: 0, created_by: 'guru.satu' },
  { id: 103, subject_id: 8, subject_label: 'Informatika', class_ids: [], class_labels: [], slug: 'algoritma', label: 'Algoritma', display_order: 1, requires_token: true, token_configured: true, question_count: 5, created_by: 'guru.satu' },
];

async function chooseSelectOption(wrapper: VueWrapper, ariaLabel: string, optionLabel: string) {
  const select = wrapper.findAll('.ruas-select').find((entry) => entry.get('.ruas-select-trigger').attributes('aria-label') === ariaLabel);
  expect(select, `RuasSelect "${ariaLabel}" harus ada`).toBeTruthy();
  await select!.get('.ruas-select-trigger').trigger('click');
  const option = select!.findAll('.ruas-select-option').find((entry) => entry.text() === optionLabel);
  expect(option, `Opsi "${optionLabel}" pada "${ariaLabel}" harus ada`).toBeTruthy();
  await option!.trigger('click');
  await flushPromises();
}

describe('CurriculumPanel', () => {
  beforeEach(() => {
    fetchAdminCurriculumMock.mockReset();
    fetchAdminTopicsMock.mockReset();
    fetchAdminScheduleMock.mockReset();
    fetchAdminCurriculumMock.mockResolvedValue(curriculumFixture);
    fetchAdminTopicsMock.mockResolvedValue(topicsFixture);
    fetchAdminScheduleMock.mockResolvedValue([{ topic_id: 101 }, { topic_id: 103 }]);
  });

  it('guru: strip struktur tertutup secara default dan topik tampil berkelompok per mata pelajaran', async () => {
    const wrapper = mount(CurriculumPanel, { props: { adminSession: teacherSession, simplified: true } });
    await flushPromises();

    // Strip ringkasan struktur menggantikan panel saringan besar.
    const strip = wrapper.get('.structure-strip');
    expect(strip.text()).toContain('2 Jenis Asesmen');
    expect(strip.text()).toContain('Kuis, Ulangan Harian');
    expect(strip.text()).toContain('2 Mata Pelajaran');
    expect(strip.text()).toContain('Matematika, Informatika');
    expect(strip.text()).toContain('Impor CSV struktur');
    expect(wrapper.find('.curriculum-filter-panel').exists()).toBe(false);
    expect(wrapper.find('.topic-toolbar-slim').exists()).toBe(true);
    expect(wrapper.find('.mobile-curriculum-tabs').exists()).toBe(false);
    expect(wrapper.get('.curriculum-heading-actions').text()).not.toContain('Impor CSV');

    // Hanya grup Topik yang dirender: daftar jenis/mapel tertutup,
    // grup Kelas tidak ada di konteks guru.
    expect(wrapper.findAll('.curriculum-group')).toHaveLength(1);
    expect(wrapper.find('.class-group').exists()).toBe(false);
    expect(wrapper.findAll('.curriculum-group h3').map((heading) => heading.text())).toEqual(['Topik']);
    expect(wrapper.findAll('.curriculum-add-btn')).toHaveLength(1);
    expect(wrapper.get('.topic-group .curriculum-add-btn').text()).toBe('＋ Topik baru');

    // Topik berkelompok per mata pelajaran mengikuti urutan data mapel,
    // dengan elemen kesiapan yang sama seperti sebelumnya.
    const groups = wrapper.findAll('.topic-subject-group');
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.get('.topic-subject-heading').text())).toEqual(['Matematika', 'Informatika']);
    expect(groups[0].findAll('.curriculum-item > div > strong').map((el) => el.text())).toEqual(['Aljabar Dasar', 'Geometri Ruang']);
    expect(groups[1].findAll('.curriculum-item > div > strong').map((el) => el.text())).toEqual(['Algoritma']);
    expect(wrapper.text()).toContain('Siap dibuka');
    expect(wrapper.text()).toContain('10 soal');
    expect(wrapper.text()).toContain('Belum ada soal');
    expect(wrapper.text()).toContain('Langkah berikutnya: Tambah soal ke topik ini');
  });

  it('guru: tombol Kelola membuka daftar lengkap jenis asesmen dan mata pelajaran, lalu menutupnya lagi', async () => {
    const wrapper = mount(CurriculumPanel, { props: { adminSession: teacherSession, simplified: true } });
    await flushPromises();

    const rows = wrapper.findAll('.structure-summary-row');
    const subjectsManageButton = rows[1].get('.structure-manage-btn');
    await subjectsManageButton.trigger('click');

    const subjectGroup = wrapper.get('.subject-group');
    expect(subjectGroup.text()).toContain('Informatika');
    expect(subjectGroup.text()).toContain('3 attempts');
    expect(subjectGroup.get('.curriculum-add-btn').text()).toBe('＋ Tambah');
    expect(wrapper.findAll('.curriculum-group h3').map((heading) => heading.text())).toEqual(['Mata Pelajaran', 'Topik']);
    expect(subjectsManageButton.text()).toBe('Tutup');

    await subjectsManageButton.trigger('click');
    expect(wrapper.find('.subject-group').exists()).toBe(false);
    expect(subjectsManageButton.text()).toBe('Kelola');

    await rows[0].get('.structure-manage-btn').trigger('click');
    expect(wrapper.findAll('.curriculum-group h3').map((heading) => heading.text())).toEqual(['Jenis Asesmen', 'Topik']);
    expect(wrapper.text()).toContain('Ulangan Harian');
  });

  it('guru: grup Kelas tidak dirender tetapi data kelas tetap memasok filter dan form topik', async () => {
    const wrapper = mount(CurriculumPanel, { props: { adminSession: teacherSession, simplified: true } });
    await flushPromises();

    expect(wrapper.find('.class-group').exists()).toBe(false);
    expect(wrapper.findAll('.curriculum-group h3').map((heading) => heading.text())).not.toContain('Kelas');

    // Opsi filter kelas pada bilah perkakas berasal dari data kurikulum
    // yang tetap dimuat walau grup UI-nya disembunyikan.
    const classSelect = wrapper.findAll('.ruas-select').find((entry) => entry.get('.ruas-select-trigger').attributes('aria-label') === 'Filter kelas topik');
    await classSelect!.get('.ruas-select-trigger').trigger('click');
    expect(classSelect!.findAll('.ruas-select-option').map((option) => option.text())).toContain('Kelas 11 TKJ A');

    // Pilihan "Kelas tujuan" pada form topik juga tetap lengkap.
    await wrapper.get('.topic-group .curriculum-add-btn').trigger('click');
    const classOptions = wrapper.findAll('.topic-class-option').map((option) => option.text());
    expect(classOptions).toContain('Semua kelas');
    expect(classOptions).toContain('Kelas 11 TKJ A');
    expect(classOptions).toContain('Kelas 11 TKJ B');
  });

  it('guru: saringan bilah perkakas menyaring topik dengan semantik yang sama', async () => {
    const wrapper = mount(CurriculumPanel, { props: { adminSession: teacherSession, simplified: true } });
    await flushPromises();

    // Pencarian teks: hanya topik yang cocok yang tampil.
    await wrapper.get('.topic-toolbar-slim input[type="search"]').setValue('geometri');
    await flushPromises();
    expect(wrapper.findAll('.topic-group .curriculum-item > div > strong').map((el) => el.text())).toEqual(['Geometri Ruang']);
    expect(wrapper.get('.topic-list-meta').text()).toContain('1 topik ditemukan');
    expect(wrapper.findAll('.topic-subject-heading').map((el) => el.text())).toEqual(['Matematika']);

    // Reset pada baris meta mengembalikan semua topik.
    await wrapper.get('.topic-list-meta button').trigger('click');
    await flushPromises();
    expect(wrapper.get('.topic-list-meta').text()).toContain('3 topik ditemukan');

    // Saringan mata pelajaran dari panel lama kini tinggal di bilah.
    await chooseSelectOption(wrapper, 'Filter mata pelajaran topik', 'Informatika');
    expect(wrapper.findAll('.topic-group .curriculum-item > div > strong').map((el) => el.text())).toEqual(['Algoritma']);
    expect(wrapper.findAll('.topic-subject-heading').map((el) => el.text())).toEqual(['Informatika']);

    await wrapper.get('.topic-list-meta button').trigger('click');
    await flushPromises();

    // Saringan kelas: topik khusus Kelas 11 TKJ A hilang saat kelas lain dipilih;
    // topik "Semua kelas" tetap tampil.
    await chooseSelectOption(wrapper, 'Filter kelas topik', 'Kelas 11 TKJ B');
    expect(wrapper.findAll('.topic-group .curriculum-item > div > strong').map((el) => el.text())).toEqual(['Aljabar Dasar', 'Algoritma']);
    expect(wrapper.get('.topic-list-meta').text()).toContain('2 topik ditemukan');
  });

  it('guru: saringan jenis asesmen pada bilah membatasi mata pelajaran dan topiknya', async () => {
    const wrapper = mount(CurriculumPanel, { props: { adminSession: teacherSession, simplified: true } });
    await flushPromises();

    await chooseSelectOption(wrapper, 'Filter jenis asesmen topik', 'Ulangan Harian');
    expect(wrapper.findAll('.topic-group .curriculum-item > div > strong').map((el) => el.text())).toEqual(['Algoritma']);
    expect(wrapper.findAll('.topic-subject-heading').map((el) => el.text())).toEqual(['Informatika']);
  });

  it('admin: struktur lama dirender persis tanpa strip dan tanpa pengelompokan topik', async () => {
    const wrapper = mount(CurriculumPanel, { props: { adminSession: adminSessionFixture } });
    await flushPromises();

    expect(wrapper.find('.structure-strip').exists()).toBe(false);
    expect(wrapper.find('.topic-toolbar-slim').exists()).toBe(false);
    expect(wrapper.find('.curriculum-filter-panel').exists()).toBe(true);
    expect(wrapper.get('.curriculum-filter-result').text()).toContain('Menampilkan 2 kelas · 2 jenis · 2 mata pelajaran');
    expect(wrapper.get('.curriculum-heading-actions').text()).toContain('Impor CSV');

    expect(wrapper.findAll('.curriculum-group h3').map((heading) => heading.text())).toEqual(['Kelas', 'Jenis Asesmen', 'Mata Pelajaran', 'Topik']);
    expect(wrapper.get('.class-group').text()).toContain('Kelas 11 TKJ A');
    expect(wrapper.find('.topic-list-toolbar').exists()).toBe(true);
    expect(wrapper.get('.topic-group .curriculum-add-btn').text()).toBe('＋ Tambah');

    // Daftar topik admin tetap datar mengikuti urutan data, tanpa heading mapel.
    expect(wrapper.find('.topic-subject-group').exists()).toBe(false);
    expect(wrapper.findAll('.topic-group .curriculum-item > div > strong').map((el) => el.text())).toEqual(['Aljabar Dasar', 'Geometri Ruang', 'Algoritma']);
  });

  it('guru: tombol Isi soal pada topik memancarkan openTopicQuestions dengan id topiknya', async () => {
    const wrapper = mount(CurriculumPanel, { props: { adminSession: teacherSession, simplified: true } });
    await flushPromises();

    const buttons = wrapper.findAll('.topic-questions-action');
    expect(buttons).toHaveLength(3);
    expect(buttons.map((button) => button.attributes('aria-label'))).toEqual([
      'Isi soal topik Aljabar Dasar',
      'Isi soal topik Geometri Ruang',
      'Isi soal topik Algoritma',
    ]);

    await buttons[1].trigger('click');
    expect(wrapper.emitted('openTopicQuestions')).toEqual([[102]]);
  });

  it('admin: tidak ada tombol Isi soal pada daftar topik', async () => {
    const wrapper = mount(CurriculumPanel, { props: { adminSession: adminSessionFixture } });
    await flushPromises();

    expect(wrapper.find('.topic-questions-action').exists()).toBe(false);
  });

  it('guru: tombol Atur jadwal pada topik memancarkan openTopicSchedule dengan id topiknya', async () => {
    const wrapper = mount(CurriculumPanel, { props: { adminSession: teacherSession, simplified: true } });
    await flushPromises();

    const buttons = wrapper.findAll('.topic-schedule-action');
    expect(buttons).toHaveLength(3);
    expect(buttons.map((button) => button.attributes('aria-label'))).toEqual([
      'Atur jadwal topik Aljabar Dasar',
      'Atur jadwal topik Geometri Ruang',
      'Atur jadwal topik Algoritma',
    ]);

    await buttons[0].trigger('click');
    expect(wrapper.emitted('openTopicSchedule')).toEqual([[101]]);
  });

  it('admin: tidak ada tombol Atur jadwal pada daftar topik', async () => {
    const wrapper = mount(CurriculumPanel, { props: { adminSession: adminSessionFixture } });
    await flushPromises();

    expect(wrapper.find('.topic-schedule-action').exists()).toBe(false);
  });
});
