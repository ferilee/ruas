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

  it('does not render the full panel automatically once every step is complete', async () => {
    const wrapper = mount(TeacherOnboardingWizard, {
      props: {
        ...baseProps,
        classCount: 1,
        subjectCount: 1,
        assessmentTypeCount: 1,
        topicCount: 1,
        questionCount: 4,
        securedTopicCount: 1,
        scheduledTopicCount: 1,
      },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.onboarding-panel').exists()).toBe(false);
    expect(wrapper.find('#onboarding-title').exists()).toBe(false);
    const collapsed = wrapper.find('.onboarding-collapsed');
    expect(collapsed.exists()).toBe(true);
    expect(collapsed.text()).toContain('Panduan awal');
    expect(collapsed.text()).toContain('Semua 6 langkah selesai');
  });

  it('opens the full panel again when the teacher asks for it manually', async () => {
    const wrapper = mount(TeacherOnboardingWizard, {
      props: {
        ...baseProps,
        classCount: 1,
        subjectCount: 1,
        assessmentTypeCount: 1,
        topicCount: 1,
        questionCount: 4,
        securedTopicCount: 1,
        scheduledTopicCount: 1,
      },
    });
    await wrapper.vm.$nextTick();

    await wrapper.find('.onboarding-collapsed button').trigger('click');
    expect(wrapper.find('.onboarding-panel').exists()).toBe(true);
    expect(wrapper.find('#onboarding-title').text()).toContain('Siapkan asesmen pertamamu');
    expect(wrapper.find('.onboarding-progress').text()).toContain('6 dari 6 langkah selesai');

    // Menutupnya lagi mengembalikan ke bilah ringkas, bukan panel otomatis.
    await wrapper.find('.onboarding-skip').trigger('click');
    expect(wrapper.find('.onboarding-panel').exists()).toBe(false);
    expect(wrapper.find('.onboarding-collapsed').exists()).toBe(true);
  });

  it('collapses automatically when progress becomes complete while the panel is open', async () => {
    const wrapper = mount(TeacherOnboardingWizard, {
      props: { ...baseProps, classCount: 1, subjectCount: 1, assessmentTypeCount: 1, topicCount: 1, questionCount: 4 },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.onboarding-panel').exists()).toBe(true);

    await wrapper.setProps({ securedTopicCount: 1, scheduledTopicCount: 1 });
    expect(wrapper.find('.onboarding-panel').exists()).toBe(false);
    expect(wrapper.find('.onboarding-collapsed').exists()).toBe(true);
  });
});
