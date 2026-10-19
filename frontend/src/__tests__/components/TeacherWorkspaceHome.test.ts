import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TeacherWorkspaceHome from '@/components/TeacherWorkspaceHome.vue';

describe('TeacherWorkspaceHome', () => {
  it('renders the compact dashboard cards and quick actions', () => {
    const wrapper = mount(TeacherWorkspaceHome, {
      props: { classCount: 3, assessmentTypeCount: 2, subjectCount: 4, topicCount: 5, questionCount: 18, scheduleCount: 2, participantCount: 30 },
    });

    expect(wrapper.findAll('.teacher-workspace-card')).toHaveLength(5);
    expect(wrapper.findAll('.workspace-action-button')).toHaveLength(5);
    expect(wrapper.text()).toContain('3 kelas');
    expect(wrapper.text()).toContain('18 soal tersedia');
    expect(wrapper.text()).toContain('2 topik memiliki jadwal');
    expect(wrapper.text()).toContain('30 siswa terdaftar');
  });

  it('emits create and navigate actions from the dashboard', async () => {
    const wrapper = mount(TeacherWorkspaceHome, {
      props: { classCount: 0, assessmentTypeCount: 0, subjectCount: 0, topicCount: 0, questionCount: 0, scheduleCount: 0, participantCount: 0 },
    });

    await wrapper.findAll('.workspace-action-button')[4].trigger('click');
    await wrapper.find('.workspace-mini-link').trigger('click');

    expect(wrapper.emitted('create')).toEqual([['question']]);
    expect(wrapper.emitted('navigate')).toEqual([['questions']]);
  });
});
