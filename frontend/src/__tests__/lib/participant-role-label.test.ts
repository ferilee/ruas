import { describe, expect, it } from 'vitest';
import { participantRoleLabel } from '@/lib/participant-profile';

describe('participantRoleLabel (RUAS-004)', () => {
  it('labels editor accounts as Guru and admin accounts as Admin', () => {
    expect(participantRoleLabel({ is_demo: false, account_role: 'editor' })).toBe('Guru');
    expect(participantRoleLabel({ is_demo: false, account_role: 'admin' })).toBe('Admin');
  });

  it('keeps pure participant accounts as Peserta', () => {
    expect(participantRoleLabel({ is_demo: false, account_role: 'participant' })).toBe('Peserta');
    expect(participantRoleLabel({ is_demo: false, account_role: null })).toBe('Peserta');
    expect(participantRoleLabel({ is_demo: false })).toBe('Peserta');
  });

  it('keeps the demo label for demo accounts', () => {
    expect(participantRoleLabel({ is_demo: true, account_role: 'participant' })).toBe('Demo');
  });
});
