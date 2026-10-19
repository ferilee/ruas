import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TeacherWorkspaceHome from '@/components/TeacherWorkspaceHome.vue';

describe('TeacherWorkspaceHome', () => {
  it('renders the four primary setup cards with their counts', () => {
    const wrapper = mount(TeacherWorkspaceHome, {
      props: { classCount: 3, assessmentTypeCount: 2, subjectCount: 4, questionCount: 18 },
    });

    expect(wrapper.findAll('.teacher-workspace-card')).toHaveLength(4);
    expect(wrapper.text()).toContain('3 kelas tersedia');
    expect(wrapper.text()).toContain('2 jenis tersedia');
    expect(wrapper.text()).toContain('4 mata pelajaran tersedia');
    expect(wrapper.text()).toContain('18 soal tersedia');
  });

  it('emits the selected setup action when a card is clicked', async () => {
    const wrapper = mount(TeacherWorkspaceHome, {
      props: { classCount: 0, assessmentTypeCount: 0, subjectCount: 0, questionCount: 0 },
    });

    await wrapper.findAll('.teacher-workspace-card')[3].trigger('click');

    expect(wrapper.emitted('create')).toEqual([['question']]);
  });
});
