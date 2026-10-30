import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import TeacherClassesPanel from '@/components/TeacherClassesPanel.vue';

const { fetchMyClassesMock, addMyClassMock, removeMyClassMock } = vi.hoisted(() => ({
  fetchMyClassesMock: vi.fn(),
  addMyClassMock: vi.fn(),
  removeMyClassMock: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  fetchMyClasses: fetchMyClassesMock,
  addMyClass: addMyClassMock,
  removeMyClass: removeMyClassMock,
}));

const payload = {
  classes: [
    { id: 3, slug: '11-tkj-a', label: 'Kelas 11 TKJ A', academic_year: '2026/2027', student_count: 32 },
    { id: 5, slug: '11-tkj-b', label: 'Kelas 11 TKJ B', academic_year: '2026/2027', student_count: 30 },
    { id: 9, slug: '10-rpl', label: 'Kelas 10 RPL', academic_year: '2026/2027', student_count: 0 },
  ],
  mappings: [
    { class_id: 3, source: 'admin' as const, created_by: 'env-admin', created_at: null },
    { class_id: 5, source: 'self' as const, created_by: 'guru.satu', created_at: null },
  ],
};

async function openPicker(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('.teacher-classes-manage-button').trigger('click');
}

describe('TeacherClassesPanel', () => {
  beforeEach(() => {
    fetchMyClassesMock.mockReset();
    addMyClassMock.mockReset();
    removeMyClassMock.mockReset();
    fetchMyClassesMock.mockResolvedValue(payload);
  });

  it('shows a compact summary by default when the teacher already has classes', async () => {
    const wrapper = mount(TeacherClassesPanel);
    await flushPromises();

    // Ringkasan: kalimat jumlah kelas + total siswa, chip baca-saja per kelas
    // beserta hitungan siswanya; pemilih lengkap belum dirender.
    expect(wrapper.find('.teacher-classes-summary-text').text()).toContain('2 kelas');
    expect(wrapper.find('.teacher-classes-summary-text').text()).toContain('62 siswa');
    const chips = wrapper.findAll('.teacher-classes-summary-chip');
    expect(chips).toHaveLength(2);
    expect(chips[0].text()).toContain('Kelas 11 TKJ A');
    expect(chips[0].text()).toContain('32 siswa');
    expect(chips[1].text()).toContain('Kelas 11 TKJ B');
    expect(chips[1].text()).toContain('30 siswa');
    expect(wrapper.find('.class-picker').exists()).toBe(false);
    expect(wrapper.find('.teacher-classes-manage-button').exists()).toBe(true);
  });

  it('opens the full picker from Kelola kelas and closes it again with Selesai', async () => {
    const wrapper = mount(TeacherClassesPanel);
    await flushPromises();

    await openPicker(wrapper);
    expect(wrapper.find('.class-picker').exists()).toBe(true);
    expect(wrapper.find('.teacher-classes-summary').exists()).toBe(false);

    await wrapper.get('.teacher-classes-done-button').trigger('click');
    expect(wrapper.find('.class-picker').exists()).toBe(false);
    expect(wrapper.find('.teacher-classes-summary').exists()).toBe(true);
  });

  it('opens the picker automatically when the teacher has no classes yet', async () => {
    fetchMyClassesMock.mockResolvedValue({ ...payload, mappings: [] });
    const wrapper = mount(TeacherClassesPanel);
    await flushPromises();

    expect(wrapper.find('.class-picker').exists()).toBe(true);
    expect(wrapper.find('.teacher-classes-summary').exists()).toBe(false);
    expect(wrapper.find('.teacher-classes-manage-button').exists()).toBe(false);
    // Tanpa kelas terpilih, guru tidak bisa menutup pemilih ke ringkasan kosong.
    expect(wrapper.find('.teacher-classes-done-button').exists()).toBe(false);
    expect(wrapper.text()).toContain('Anda belum terpetakan ke kelas mana pun');
  });

  it('shows mapped classes as picker selections with their source badges', async () => {
    const wrapper = mount(TeacherClassesPanel);
    await flushPromises();
    await openPicker(wrapper);

    expect(wrapper.text()).toContain('Kelas 11 TKJ A');
    expect(wrapper.text()).toContain('Ditetapkan admin');
    expect(wrapper.text()).toContain('Kelas 11 TKJ B');
    expect(wrapper.text()).toContain('Dipilih sendiri');
    expect(wrapper.find('.class-picker-count').text()).toBe('2 kelas dipilih');
    expect(wrapper.findAll('.class-picker-option.selected')).toHaveLength(2);
    expect(wrapper.findAll('.class-picker-chip')).toHaveLength(2);
    // Ruang kerja guru satu mode terang: pemilih kelas wajib memakai tema terang.
    expect(wrapper.find('.class-picker').classes()).toContain('theme-light');
  });

  it('removes a mapping through the API when its chip is removed', async () => {
    removeMyClassMock.mockResolvedValue({ ...payload, mappings: [payload.mappings[0]] });
    const wrapper = mount(TeacherClassesPanel);
    await flushPromises();
    await openPicker(wrapper);

    await wrapper.get('[aria-label="Lepas Kelas 11 TKJ B · 2026/2027"]').trigger('click');
    await flushPromises();

    expect(removeMyClassMock).toHaveBeenCalledWith(5);
    expect(wrapper.findAll('.class-picker-chip')).toHaveLength(1);
    expect(wrapper.find('.class-picker-count').text()).toBe('1 kelas dipilih');
  });

  it('adds a mapping through the API when an unselected class is checked', async () => {
    addMyClassMock.mockResolvedValue({ ...payload, mappings: [...payload.mappings, { class_id: 9, source: 'self' as const, created_by: 'guru.satu', created_at: null }] });
    const wrapper = mount(TeacherClassesPanel);
    await flushPromises();
    await openPicker(wrapper);

    const row = wrapper.findAll('.class-picker-option').find((item) => item.text().includes('Kelas 10 RPL'));
    await row?.find('input[type="checkbox"]').setValue(true);
    await flushPromises();

    expect(addMyClassMock).toHaveBeenCalledWith(9);
    expect(wrapper.find('.class-picker-count').text()).toBe('3 kelas dipilih');
  });

  it('keeps the picker open after saving and refreshes the summary after closing', async () => {
    addMyClassMock.mockResolvedValue({ ...payload, mappings: [...payload.mappings, { class_id: 9, source: 'self' as const, created_by: 'guru.satu', created_at: null }] });
    const wrapper = mount(TeacherClassesPanel);
    await flushPromises();
    await openPicker(wrapper);

    const row = wrapper.findAll('.class-picker-option').find((item) => item.text().includes('Kelas 10 RPL'));
    await row?.find('input[type="checkbox"]').setValue(true);
    await flushPromises();

    // Panel tidak menutup sendiri di tengah pekerjaan guru.
    expect(wrapper.find('.class-picker').exists()).toBe(true);

    await wrapper.get('.teacher-classes-done-button').trigger('click');
    expect(wrapper.find('.teacher-classes-summary-text').text()).toContain('3 kelas');
    expect(wrapper.findAll('.teacher-classes-summary-chip')).toHaveLength(3);
  });
});
