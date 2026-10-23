import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ScheduleAudiencePicker from '@/components/ScheduleAudiencePicker.vue';

const participants = [
  { id: 1, username: 'siswa-01', display_name: 'Siswa Satu', class_id: 2, class_label: 'X TKJ A', subject_id: 3, role: 'participant' as const, active: true, is_demo: false, must_change_password: false, created_at: '', updated_at: '' },
  { id: 2, username: 'siswa-02', display_name: 'Siswa Dua', class_id: 2, class_label: 'X TKJ A', subject_id: 3, role: 'participant' as const, active: false, is_demo: false, must_change_password: false, created_at: '', updated_at: '' },
];

describe('ScheduleAudiencePicker', () => {
  it('switches to individual targeting', async () => {
    const wrapper = mount(ScheduleAudiencePicker, { props: { mode: 'class', participantIds: [], participants } });

    await wrapper.findAll('input[type="radio"]')[1]?.trigger('change');
    expect(wrapper.emitted('update:mode')).toEqual([['individual']]);
  });

  it('selects a student in individual mode', async () => {
    const wrapper = mount(ScheduleAudiencePicker, { props: { mode: 'individual', participantIds: [], participants } });

    await wrapper.findAll('input[type="checkbox"]')[0]?.trigger('change');
    expect(wrapper.emitted('update:participantIds')).toEqual([[[1]]]);
  });

  it('filters students by name, username, or class', async () => {
    const wrapper = mount(ScheduleAudiencePicker, { props: { mode: 'individual', participantIds: [1], participants } });

    await wrapper.find('.schedule-participant-search').setValue('siswa-02');
    expect(wrapper.findAll('.schedule-participant-option')).toHaveLength(1);
    expect(wrapper.text()).toContain('Siswa Dua');
  });

  it('shows selected students with their class and allows removing them', async () => {
    const wrapper = mount(ScheduleAudiencePicker, { props: { mode: 'individual', participantIds: [1], participants } });

    expect(wrapper.findAll('.schedule-selected-participant')).toHaveLength(1);
    expect(wrapper.find('.schedule-selected-participant').text()).toContain('Siswa Satu');
    expect(wrapper.find('.schedule-selected-participant').text()).toContain('X TKJ A');

    await wrapper.find('.schedule-selected-participant button').trigger('click');
    expect(wrapper.emitted('update:participantIds')).toEqual([[[]]]);
  });
});
