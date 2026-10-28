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

  it('shows mapped classes with their source badges', async () => {
    const wrapper = mount(TeacherClassesPanel);
    await flushPromises();

    expect(wrapper.text()).toContain('Kelas 11 TKJ A');
    expect(wrapper.text()).toContain('Ditetapkan admin');
    expect(wrapper.text()).toContain('Kelas 11 TKJ B');
    expect(wrapper.text()).toContain('Dipilih sendiri');
    expect(wrapper.findAll('.teacher-classes-item')).toHaveLength(2);
  });

  it('removes a mapping through the API when Lepas is clicked', async () => {
    removeMyClassMock.mockResolvedValue({ ...payload, mappings: [payload.mappings[0]] });
    const wrapper = mount(TeacherClassesPanel);
    await flushPromises();

    await wrapper.findAll('.teacher-classes-remove')[1].trigger('click');
    await flushPromises();

    expect(removeMyClassMock).toHaveBeenCalledWith(5);
    expect(wrapper.findAll('.teacher-classes-item')).toHaveLength(1);
  });
});
