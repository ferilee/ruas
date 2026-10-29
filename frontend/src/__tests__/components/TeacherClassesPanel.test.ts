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
    { id: 3, slug: '11-tkj-a', label: 'Kelas 11 TKJ A', academic_year: '2026/2027' },
    { id: 5, slug: '11-tkj-b', label: 'Kelas 11 TKJ B', academic_year: '2026/2027' },
    { id: 9, slug: '10-rpl', label: 'Kelas 10 RPL', academic_year: '2026/2027' },
  ],
  mappings: [
    { class_id: 3, source: 'admin' as const, created_by: 'env-admin', created_at: null },
    { class_id: 5, source: 'self' as const, created_by: 'guru.satu', created_at: null },
  ],
};

describe('TeacherClassesPanel', () => {
  beforeEach(() => {
    fetchMyClassesMock.mockReset();
    addMyClassMock.mockReset();
    removeMyClassMock.mockReset();
    fetchMyClassesMock.mockResolvedValue(payload);
  });

  it('shows mapped classes as picker selections with their source badges', async () => {
    const wrapper = mount(TeacherClassesPanel);
    await flushPromises();

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

    const row = wrapper.findAll('.class-picker-option').find((item) => item.text().includes('Kelas 10 RPL'));
    await row?.find('input[type="checkbox"]').setValue(true);
    await flushPromises();

    expect(addMyClassMock).toHaveBeenCalledWith(9);
    expect(wrapper.find('.class-picker-count').text()).toBe('3 kelas dipilih');
  });
});
