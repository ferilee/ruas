import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TeacherWorkspaceHome from '@/components/TeacherWorkspaceHome.vue';

const routerLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' };

describe('TeacherWorkspaceHome', () => {
  it('renders the compact dashboard cards and quick actions', () => {
    const wrapper = mount(TeacherWorkspaceHome, {
      props: { classCount: 3, assessmentTypeCount: 2, subjectCount: 4, topicCount: 5, questionCount: 18, scheduleCount: 2, participantCount: 30 },
      global: { stubs: { RouterLink: routerLinkStub } },
    });

    expect(wrapper.findAll('.teacher-workspace-card')).toHaveLength(7);
    expect(wrapper.findAll('.workspace-action-button')).toHaveLength(5);
    expect(wrapper.text()).toContain('3 kelas');
    expect(wrapper.text()).toContain('18 soal tersedia');
    expect(wrapper.text()).toContain('2 topik memiliki jadwal');
    expect(wrapper.text()).toContain('30 siswa terdaftar');
    expect(wrapper.find('.workspace-support-card').attributes('href')).toBe('/dukung');
  });

  it('emits create and navigate actions from the dashboard', async () => {
    const wrapper = mount(TeacherWorkspaceHome, {
      props: { classCount: 0, assessmentTypeCount: 0, subjectCount: 0, topicCount: 0, questionCount: 0, scheduleCount: 0, participantCount: 0 },
      global: { stubs: { RouterLink: routerLinkStub } },
    });

    await wrapper.findAll('.workspace-action-button')[4].trigger('click');
    await wrapper.find('.workspace-mini-link').trigger('click');
    await wrapper.find('.teacher-workspace-logout').trigger('click');

    expect(wrapper.emitted('create')).toEqual([['question']]);
    expect(wrapper.emitted('navigate')).toEqual([['questions']]);
    expect(wrapper.emitted('logout')).toEqual([[]]);
  });
});
