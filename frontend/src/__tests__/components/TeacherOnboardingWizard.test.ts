import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TeacherOnboardingWizard from '@/components/TeacherOnboardingWizard.vue';

const baseProps = {
  username: 'guru-matematika',
  classCount: 0,
  subjectCount: 0,
  assessmentTypeCount: 0,
  topicCount: 0,
  questionCount: 0,
  securedTopicCount: 0,
  scheduledTopicCount: 0,
};

describe('TeacherOnboardingWizard', () => {
  beforeEach(() => localStorage.clear());

  it('guides a teacher to the first incomplete setup step', async () => {
    const wrapper = mount(TeacherOnboardingWizard, { props: baseProps });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('#onboarding-title').text()).toContain('Siapkan asesmen pertamamu');
    expect(wrapper.find('.onboarding-current h3').text()).toBe('Siapkan kelas');

    await wrapper.find('.onboarding-action').trigger('click');
    expect(wrapper.emitted('navigate')).toEqual([['curriculum']]);
  });

  it('shows the first incomplete step after completed setup items', async () => {
    const wrapper = mount(TeacherOnboardingWizard, {
      props: { ...baseProps, classCount: 1, subjectCount: 1, assessmentTypeCount: 1, topicCount: 1, questionCount: 4 },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.onboarding-current h3').text()).toBe('Atur akses dan jadwal');
    expect(wrapper.find('.onboarding-progress').text()).toContain('5 dari 6 langkah selesai');
  });
});
