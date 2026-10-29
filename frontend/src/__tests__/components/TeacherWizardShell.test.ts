import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TeacherWizardShell, { type TeacherWizardStepDef } from '@/components/TeacherWizardShell.vue';
import { TEACHER_STEPS } from '@/lib/teacher-wizard';

const steps: TeacherWizardStepDef[] = TEACHER_STEPS.map((step) => ({
  ...step,
  complete: step.id === 'kelas' ? true : step.id === 'laporan' ? null : false,
}));

function mountShell(activeStep: TeacherWizardStepDef['id'] = 'topik') {
  return mount(TeacherWizardShell, {
    props: { steps, activeStep, displayName: 'Feri Lee', sessionRole: 'editor' },
    slots: { default: '<div class="panel-uji">Isi langkah</div>' },
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  });
}

describe('TeacherWizardShell', () => {
  it('renders all five steps with numbers and a check for completed ones', () => {
    const wrapper = mountShell();
    const stepButtons = wrapper.findAll('.wizard-step');
    expect(stepButtons).toHaveLength(5);
    expect(stepButtons[0].find('.wizard-step-number').text()).toBe('✓');
    expect(stepButtons[0].classes()).toContain('is-complete');
    expect(stepButtons[1].find('.wizard-step-number').text()).toBe('2');
    // Laporan tidak punya tanda selesai: tetap nomor, tidak is-complete.
    expect(stepButtons[4].find('.wizard-step-number').text()).toBe('5');
    expect(stepButtons[4].classes()).not.toContain('is-complete');
  });

  it('marks the active step and announces the heading with its position', () => {
    const wrapper = mountShell('topik');
    const active = wrapper.find('.wizard-step.is-active');
    expect(active.text()).toContain('Topik');
    expect(active.attributes('aria-current')).toBe('step');
    expect(wrapper.find('.wizard-main-heading').text()).toContain('Langkah 2 dari 5');
    expect(wrapper.find('.wizard-main-heading h2').text()).toBe('Topik');
    expect(wrapper.find('.panel-uji').exists()).toBe(true);
  });

  it('emits the chosen step when a step button is clicked', async () => {
    const wrapper = mountShell();
    await wrapper.findAll('.wizard-step')[3].trigger('click');
    expect(wrapper.emitted('select-step')).toEqual([['jadwal']]);
  });

  it('shows the teacher identity pill and emits back/logout/feedback', async () => {
    const wrapper = mountShell();
    expect(wrapper.find('.wizard-identity').text()).toBe('Feri Lee · Guru');
    expect(wrapper.find('.wizard-profile strong').text()).toBe('Feri Lee');

    const buttons = wrapper.findAll('.wizard-topbar-btn');
    await buttons[0].trigger('click');
    await buttons[1].trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
    expect(wrapper.emitted('logout')).toHaveLength(1);

    await wrapper.find('.wizard-sidebar-footer button').trigger('click');
    expect(wrapper.emitted('feedback')).toHaveLength(1);
  });
});
