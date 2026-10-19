import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TeacherApplyView from '@/views/TeacherApplyView.vue';

const { submitTeacherAccessRequest } = vi.hoisted(() => ({ submitTeacherAccessRequest: vi.fn() }));

vi.mock('@/api/client', () => ({ submitTeacherAccessRequest }));

describe('TeacherApplyView', () => {
  beforeEach(() => submitTeacherAccessRequest.mockReset());

  it('submits a teacher access request and shows confirmation', async () => {
    submitTeacherAccessRequest.mockResolvedValue(undefined);
    const wrapper = mount(TeacherApplyView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } });
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('Guru Matematika');
    await inputs[1].setValue('guru.matematika');
    await inputs[5].setValue('rahasia123');
    await inputs[6].setValue('rahasia123');
    await wrapper.find('form').trigger('submit');

    await vi.waitFor(() => expect(submitTeacherAccessRequest).toHaveBeenCalledWith(expect.objectContaining({ username: 'guru.matematika', display_name: 'Guru Matematika' })));
    expect(wrapper.find('.teacher-apply-success').exists()).toBe(true);
  });
});
