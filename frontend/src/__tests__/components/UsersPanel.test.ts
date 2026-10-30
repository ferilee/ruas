import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import UsersPanel from '@/components/UsersPanel.vue';
import type { AdminSession } from '@/types';

const {
  fetchAdminUsersMock,
  fetchAdminParticipantCountMock,
  fetchAdminCurriculumMock,
  updateAdminUserMock,
} = vi.hoisted(() => ({
  fetchAdminUsersMock: vi.fn(),
  fetchAdminParticipantCountMock: vi.fn(),
  fetchAdminCurriculumMock: vi.fn(),
  updateAdminUserMock: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  assignAdminUsersClass: vi.fn(),
  assignAdminUsersSubject: vi.fn(),
  createAdminUser: vi.fn(),
  deleteAdminUser: vi.fn(),
  deleteAllAdminParticipants: vi.fn(),
  fetchAdminCurriculum: fetchAdminCurriculumMock,
  fetchAdminParticipantCount: fetchAdminParticipantCountMock,
  fetchAdminUsers: fetchAdminUsersMock,
  importAdminUsers: vi.fn(),
  resetAdminUserPassword: vi.fn(),
  updateAdminUser: updateAdminUserMock,
}));

const teacherSession: AdminSession = { username: 'guru.satu', display_name: 'Guru Satu', role: 'editor', subject_id: 7, class_id: 3, class_ids: [3] };
const adminSessionFixture: AdminSession = { username: 'admin', display_name: 'Admin', role: 'admin', subject_id: null, class_id: null, class_ids: [] };

const studentRow = {
  id: 11,
  username: 'siswa.satu',
  display_name: 'Siswa Satu',
  class_id: 3,
  class_label: 'Kelas 11 TKJ A',
  subject_id: 7,
  role: 'participant' as const,
  active: true,
  is_demo: false,
  must_change_password: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('UsersPanel', () => {
  beforeEach(() => {
    fetchAdminUsersMock.mockReset();
    fetchAdminParticipantCountMock.mockReset();
    fetchAdminCurriculumMock.mockReset();
    updateAdminUserMock.mockReset();
    fetchAdminUsersMock.mockResolvedValue([studentRow]);
    updateAdminUserMock.mockResolvedValue(studentRow);
    fetchAdminParticipantCountMock.mockResolvedValue(141);
    fetchAdminCurriculumMock.mockResolvedValue({ classes: [], subjects: [], assessment_types: [] });
  });

  it('teacher search-first mode does not load or render the user list before searching', async () => {
    const wrapper = mount(UsersPanel, { props: { adminSession: teacherSession, searchFirst: true } });
    await flushPromises();

    expect(fetchAdminUsersMock).not.toHaveBeenCalled();
    expect(wrapper.find('.user-table').exists()).toBe(false);
    expect(wrapper.find('.teacher-search-hint').text()).toContain('141 akun di kelas Anda');
    expect(wrapper.find('.users-list-heading').text()).toContain('141 akun di kelas Anda.');
    expect(wrapper.find('.user-search input').attributes('placeholder')).toContain('Cari siswa berdasarkan nama atau username');
    // Aksi sekunder tetap terlihat tanpa membuka daftar.
    expect(wrapper.text()).toContain('Tambah pengguna');
    expect(wrapper.text()).toContain('Import pengguna');
  });

  it('teacher search-first mode renders results after searching and can reset to the initial state', async () => {
    const wrapper = mount(UsersPanel, { props: { adminSession: teacherSession, searchFirst: true } });
    await flushPromises();

    await wrapper.get('.user-search input').setValue('siswa');
    await wrapper.get('.search-button').trigger('click');
    await flushPromises();

    expect(fetchAdminUsersMock).toHaveBeenCalledWith('siswa');
    expect(wrapper.find('.user-table').exists()).toBe(true);
    expect(wrapper.text()).toContain('Siswa Satu');
    expect(wrapper.find('.teacher-search-hint').exists()).toBe(false);
    expect(wrapper.find('.users-list-heading').text()).toContain('1 akun ditemukan.');

    await wrapper.get('.search-reset-button').trigger('click');
    await flushPromises();

    expect(wrapper.find('.user-table').exists()).toBe(false);
    expect(wrapper.find('.teacher-search-hint').exists()).toBe(true);
    expect((wrapper.get('.user-search input').element as HTMLInputElement).value).toBe('');
  });

  it('teacher search-first mode stays on the search results after editing a user', async () => {
    const wrapper = mount(UsersPanel, { props: { adminSession: teacherSession, searchFirst: true } });
    await flushPromises();

    await wrapper.get('.user-search input').setValue('siswa');
    await wrapper.get('.search-button').trigger('click');
    await flushPromises();
    expect(wrapper.find('.user-table').exists()).toBe(true);

    const editButton = wrapper.findAll('.user-actions .text-button').find((button) => button.text() === 'Edit');
    await editButton?.trigger('click');
    await wrapper.get('.user-form').trigger('submit');
    await flushPromises();

    expect(updateAdminUserMock).toHaveBeenCalledWith(11, expect.objectContaining({ username: 'siswa.satu' }));
    // Daftar tidak terpental ke keadaan awal: hasil pencarian yang sama dimuat ulang.
    expect(fetchAdminUsersMock).toHaveBeenLastCalledWith('siswa');
    expect(wrapper.find('.user-table').exists()).toBe(true);
    expect(wrapper.find('.teacher-search-hint').exists()).toBe(false);
  });

  it('teacher mode without searchFirst still loads the list immediately', async () => {
    const wrapper = mount(UsersPanel, { props: { adminSession: teacherSession } });
    await flushPromises();

    expect(fetchAdminUsersMock).toHaveBeenCalled();
    expect(wrapper.find('.user-table').exists()).toBe(true);
    expect(wrapper.find('.teacher-search-hint').exists()).toBe(false);
  });

  it('admin mode renders the list immediately and never shows the search hint', async () => {
    const wrapper = mount(UsersPanel, { props: { adminSession: adminSessionFixture } });
    await flushPromises();

    expect(fetchAdminUsersMock).toHaveBeenCalledWith('');
    expect(wrapper.find('.user-table').exists()).toBe(true);
    expect(wrapper.text()).toContain('Siswa Satu');
    expect(wrapper.find('.teacher-search-hint').exists()).toBe(false);
    expect(wrapper.find('.search-reset-button').exists()).toBe(false);
    expect(wrapper.find('.users-list-heading').text()).toContain('1 akun ditemukan.');
  });
});
