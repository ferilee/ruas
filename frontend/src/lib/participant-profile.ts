import type { ParticipantProfile } from '@/types';

const CLIENT_ID_KEY = 'participant_client_id';
const LEGACY_PROFILE_KEY = 'participant_profile';

export function getParticipantClientId(): string {
  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

export function getLegacyParticipantProfile(): ParticipantProfile | null {
  const raw = localStorage.getItem(LEGACY_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParticipantProfile;
  } catch {
    return null;
  }
}

export function clearLegacyParticipantProfile(): void {
  localStorage.removeItem(LEGACY_PROFILE_KEY);
}

// RUAS-004: label peran di beranda mengikuti peran akun database — akun
// admin/editor tampil sebagai Admin/Guru, bukan selalu "Peserta".
export function participantRoleLabel(profile: Pick<ParticipantProfile, 'is_demo' | 'account_role'> | null | undefined): string {
  if (profile?.is_demo) return 'Demo';
  if (profile?.account_role === 'admin') return 'Admin';
  if (profile?.account_role === 'editor') return 'Guru';
  return 'Peserta';
}
