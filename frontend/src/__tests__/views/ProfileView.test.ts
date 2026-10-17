import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ProfileView from '@/views/ProfileView.vue';

const { fetchParticipantProfile, saveParticipantProfile, replace } = vi.hoisted(() => ({
  fetchParticipantProfile: vi.fn(),
  saveParticipantProfile: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  fetchParticipantProfile,
  saveParticipantProfile,
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace }),
}));

function profile(overrides: Record<string, unknown> = {}) {
  return {
    username: 'siswa01',
    participant_code: 'siswa01',
    name: 'Siswa Satu',
    gender: '',
    birth_date: '',
    subject_id: 7,
    subject_label: 'Matematika',
    class_label: '11 TKJ A',
    assessment_type_label: 'Asesmen Tengah Semester',
    is_demo: false,
    is_complete: false,
    ...overrides,
  };
}

describe('ProfileView', () => {
  beforeEach(() => {
    fetchParticipantProfile.mockReset();
    saveParticipantProfile.mockReset();
    replace.mockReset();
  });

  it('saves gender and birth date when the user submits the form', async () => {
    fetchParticipantProfile.mockResolvedValue(profile());
    saveParticipantProfile.mockResolvedValue(profile({ gender: 'male', birth_date: '2007-01-01', is_complete: true }));

    const wrapper = mount(ProfileView);
    await vi.waitFor(() => expect(wrapper.find('.profile-submit').attributes('disabled')).toBeUndefined());

    await wrapper.find('.ruas-select-trigger').trigger('click');
    await wrapper.find('.ruas-select-option').trigger('click');
    await wrapper.find('input[type="date"]').setValue('2007-01-01');
    await wrapper.find('form').trigger('submit');

    await vi.waitFor(() => expect(saveParticipantProfile).toHaveBeenCalledWith(expect.objectContaining({
      gender: 'male',
      birth_date: '2007-01-01',
      subject_id: 7,
    })));
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('explains when the admin has not assigned a subject yet', async () => {
    fetchParticipantProfile.mockResolvedValue(profile({ subject_id: null, gender: 'male', birth_date: '2007-01-01' }));

    const wrapper = mount(ProfileView);
    await vi.waitFor(() => expect(wrapper.find('.profile-submit').attributes('disabled')).toBeUndefined());
    await wrapper.find('form').trigger('submit');

    expect(wrapper.find('.profile-error').text()).toContain('Mata pelajaran belum ditetapkan');
    expect(saveParticipantProfile).not.toHaveBeenCalled();
  });
});
