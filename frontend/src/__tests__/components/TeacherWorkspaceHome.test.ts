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

    expect(wrapper.findAll('.teacher-workspace-card')).toHaveLength(8);
    expect(wrapper.findAll('.workspace-action-button')).toHaveLength(4);
    // Kelas master hanya dibuat Admin; guru tidak lagi ditawari Tambah Kelas.
    expect(wrapper.text()).not.toContain('Tambah Kelas');
    expect(wrapper.text()).toContain('3 kelas');
    expect(wrapper.text()).toContain('18 soal tersedia');
    expect(wrapper.text()).toContain('2 topik memiliki jadwal');
    expect(wrapper.text()).toContain('30 siswa terdaftar');
    expect(wrapper.find('.workspace-support-card').attributes('href')).toBe('/dukung');
    expect(wrapper.find('.workspace-simak-card').attributes('href')).toBe('https://simak.smkpasirian-lmj.sch.id/login');
    expect(wrapper.find('.workspace-simak-card').attributes('target')).toBe('_blank');
  });

  it('shows the signed-in name and role in the workspace header (RUAS-004)', () => {
    const wrapper = mount(TeacherWorkspaceHome, {
      props: { displayName: 'Feri Lee', sessionRole: 'editor', classCount: 0, assessmentTypeCount: 0, subjectCount: 0, topicCount: 0, questionCount: 0, scheduleCount: 0, participantCount: 0 },
      global: { stubs: { RouterLink: routerLinkStub } },
    });

    expect(wrapper.find('.teacher-workspace-identity').text()).toBe('Feri Lee · Guru');
  });

  it('labels admin sessions as Admin and hides identity without a name (RUAS-004)', () => {
    const adminWrapper = mount(TeacherWorkspaceHome, {
      props: { displayName: 'Admin RUAS', sessionRole: 'admin', classCount: 0, assessmentTypeCount: 0, subjectCount: 0, topicCount: 0, questionCount: 0, scheduleCount: 0, participantCount: 0 },
      global: { stubs: { RouterLink: routerLinkStub } },
    });
    expect(adminWrapper.find('.teacher-workspace-identity').text()).toBe('Admin RUAS · Admin');

    const anonymousWrapper = mount(TeacherWorkspaceHome, {
      props: { classCount: 0, assessmentTypeCount: 0, subjectCount: 0, topicCount: 0, questionCount: 0, scheduleCount: 0, participantCount: 0 },
      global: { stubs: { RouterLink: routerLinkStub } },
    });
    expect(anonymousWrapper.find('.teacher-workspace-identity').exists()).toBe(false);
  });

  it('emits create and navigate actions from the dashboard', async () => {
    const wrapper = mount(TeacherWorkspaceHome, {
      props: { classCount: 0, assessmentTypeCount: 0, subjectCount: 0, topicCount: 0, questionCount: 0, scheduleCount: 0, participantCount: 0 },
      global: { stubs: { RouterLink: routerLinkStub } },
    });

    await wrapper.findAll('.workspace-action-button')[3].trigger('click');
    await wrapper.find('.workspace-mini-link').trigger('click');
    const headerButtons = wrapper.findAll('.teacher-workspace-logout');
    expect(headerButtons.map((button) => button.text())).toEqual(['Kembali ke beranda', 'Keluar (logout)']);
    await headerButtons[0].trigger('click');
    await headerButtons[1].trigger('click');

    expect(wrapper.emitted('create')).toEqual([['question']]);
    expect(wrapper.emitted('navigate')).toEqual([['questions']]);
    expect(wrapper.emitted('back')).toEqual([[]]);
    expect(wrapper.emitted('logout')).toEqual([[]]);
  });
});
